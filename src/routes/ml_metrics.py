"""
src/routes/ml_metrics.py — ML Metrics Blueprint
"""

from flask import Blueprint, current_app, jsonify
from src.services.ml_service import get_ml_service

ml_bp = Blueprint("ml", __name__, url_prefix="/api/ml")


@ml_bp.route("/metrics", methods=["GET"])
def get_metrics():
    """
    GET /api/ml/metrics
    --------------------
    Returns the cached training evaluation metrics for the current model.

    Response 200:
        model_ready         : bool
        holdout             : { mae, rmse, r2 }
        cross_validation    : { folds, mae_mean, mae_std }
        feature_importances : { feature_name: importance_score }
        model_params        : { algorithm, n_iterations_used, ... }
        training_samples    : int
        test_samples        : int

    Response 503:
        If the model has not been trained yet.
    """
    ml = get_ml_service()

    ml_enabled = current_app.config.get("ML_INFERENCE_ENABLED", True)
    if not ml or not ml.is_ready(inference_enabled=ml_enabled):
        return jsonify({
            "model_ready": False,
            "message": (
                "Model not trained yet. "
                "Run `python src/ml/synthesize_data.py` then `python src/ml/train.py`."
            )
        }), 503

    metrics = ml.get_metrics()
    if not metrics:
        return jsonify({
            "model_ready": True,
            "message": "Model is loaded but training metrics file is missing."
        }), 206

    return jsonify({
        "model_ready": True,
        **metrics,
    }), 200


@ml_bp.route("/health", methods=["GET"])
def model_health():
    """
    GET /api/ml/health
    -------------------
    Lightweight readiness probe — returns 200 if model is loaded,
    503 otherwise. Suitable for Kubernetes liveness/readiness checks.
    """
    ml = get_ml_service()
    ml_enabled = current_app.config.get("ML_INFERENCE_ENABLED", True)
    ready = bool(ml and ml.is_ready(inference_enabled=ml_enabled))
    return jsonify({"model_ready": ready}), 200 if ready else 503
