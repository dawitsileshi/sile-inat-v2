from __future__ import annotations

import logging
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS

from config import get_config
from src.extensions import db


def create_app(config=None) -> Flask:
    """
    Application factory.

    Parameters
    ----------
    config : optional config class override (useful in tests)
    """
    app = Flask(
        __name__,
        instance_relative_config=False,
        static_folder="frontend/dist",
        static_url_path="/static",
    )

    # ── Configuration ─────────────────────────────────────────────────────────
    cfg = config or get_config()
    app.config.from_object(cfg)

    # ── Logging ───────────────────────────────────────────────────────────────
    logging.basicConfig(
        level=getattr(logging, app.config["LOG_LEVEL"], logging.INFO),
        format=app.config["LOG_FORMAT"],
    )
    log = logging.getLogger(__name__)

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS(
        app,
        resources={r"/api/*": {
            "origins": app.config["CORS_ORIGINS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Anonymous-Client-Id"],
        }},
    )

    # ── Database ──────────────────────────────────────────────────────────────
    db.init_app(app)
    with app.app_context():
        # Models MUST be imported before db.create_all() so Flask-SQLAlchemy's
        # metadata registry includes all tables.
        from src.models import (  # noqa: F401
            User, UserSession, DailyLog,
            ForumPost, ForumReply, ForumReaction,
            Circle, CirclePost, CircleMembership,
        )
        db.create_all()
        log.info("Database initialised at: %s", app.config["SQLALCHEMY_DATABASE_URI"])

        # Auto-seed the 8 mother circles on first boot — idempotent.
        # Keeps Render deploys self-sufficient without a manual seed step.
        try:
            from scripts.seed_db import seed_circles
            seed_circles()
        except Exception as exc:
            log.warning("Circle auto-seed skipped: %s", exc)

    # ── ML Service ────────────────────────────────────────────────────────────
    from src.services.ml_service import create_ml_service

    model_path = Path(app.config["MODEL_PATH"])
    create_ml_service(
        model_path   = model_path,
        metrics_path = Path(app.config["METRICS_PATH"]),
    )
    if not model_path.exists():
        log.warning(
            "⚠️  ML model not found. Inference endpoints will return "
            "predictions=null until `python src/ml/train.py` is run."
        )

    # ── Blueprints ────────────────────────────────────────────────────────────
    from src.routes.auth       import auth_bp
    from src.routes.logs       import logs_bp
    from src.routes.ml_metrics import ml_bp
    from src.routes.forum      import forum_bp
    from src.routes.chatbot    import chatbot_bp
    from src.routes.circles    import circles_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(logs_bp)
    app.register_blueprint(ml_bp)
    app.register_blueprint(forum_bp)
    app.register_blueprint(chatbot_bp)
    app.register_blueprint(circles_bp)

    # ── Root Health Check ─────────────────────────────────────────────────────
    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "maternal-wellness-api"}), 200

    # ── SPA Routing / Static Asset Catch-All ──────────────────────────────────
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def catch_all(path):
        if path.startswith("api/"):
            return jsonify({"error": "Endpoint not found."}), 404
        
        # Check if the requested path corresponds to a static file (e.g. assets)
        if path != "" and Path(app.static_folder).joinpath(path).exists():
            return app.send_static_file(path)
            
        return app.send_static_file("index.html")

    # ── Global Error Handlers ─────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed."}), 405

    @app.errorhandler(500)
    def internal_error(e):
        log.exception("Unhandled exception: %s", e)
        return jsonify({"error": "An internal server error occurred."}), 500

    log.info("✅ Flask app created in '%s' mode.", app.config.get("ENV", "development"))
    return app


# ─── Direct Execution ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    application = create_app()
    application.run(host="0.0.0.0", port=5050, debug=True, use_reloader=False)
