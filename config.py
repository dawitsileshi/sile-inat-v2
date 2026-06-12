"""
config.py — Application Configuration
======================================
Manages all application settings using environment variables with
safe defaults for development. Never commit secrets to version control.
"""

import os
from pathlib import Path

# ─── Base Paths ────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
INSTANCE_DIR = BASE_DIR / "instance"
ML_ARTIFACTS_DIR = BASE_DIR / "src" / "ml" / "artifacts"

# Ensure critical directories exist at import time
INSTANCE_DIR.mkdir(exist_ok=True)
ML_ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)


class BaseConfig:
    """Shared configuration for all environments."""

    # ── Flask Core ────────────────────────────────────────────────────────────
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-in-production-XKCD327")
    DEBUG: bool = False
    TESTING: bool = False

    # ── Database ──────────────────────────────────────────────────────────────
    _raw_db_url = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{INSTANCE_DIR / 'maternal_wellness.db'}"
    )
    # Render's Postgres URLs use the deprecated postgres:// scheme.
    # SQLAlchemy 2.x requires postgresql://, so normalize at load time.
    if _raw_db_url.startswith("postgres://"):
        _raw_db_url = _raw_db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI: str = _raw_db_url

    # Disable event system overhead (not needed for this app)
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    # Echo SQL queries only in debug mode
    SQLALCHEMY_ECHO: bool = False
    # Postgres connection hygiene — keeps pooled connections alive on Render
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_pre_ping": True,
        "pool_recycle": 280,  # under Render's 300s timeout
    }

    # ── ML Artifacts ─────────────────────────────────────────────────────────
    # Set ML_INFERENCE_ENABLED=false to skip model loading (logs still work)
    ML_INFERENCE_ENABLED: bool = os.getenv(
        "ML_INFERENCE_ENABLED", "true"
    ).lower() not in ("0", "false", "no")
    MODEL_PATH: Path = ML_ARTIFACTS_DIR / "wellbeing_model.joblib"
    SCALER_PATH: Path = ML_ARTIFACTS_DIR / "feature_scaler.joblib"
    METRICS_PATH: Path = ML_ARTIFACTS_DIR / "model_metrics.json"
    SYNTH_DATA_PATH: Path = BASE_DIR / "src" / "ml" / "data" / "synthetic_maternal_data.csv"

    # ── Feature Engineering ───────────────────────────────────────────────────
    FEATURE_COLUMNS: list = [
        "gestational_week",
        "sleep_hours",
        "water_liters",
        "symptom_score",
        "mood_score",
        "hrv_delta",           # Optional; imputed with median if missing
    ]
    TARGET_COLUMN: str = "wellbeing_index"

    # ── CORS / Security ───────────────────────────────────────────────────────
    # In production, restrict to your mobile app's actual origin
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "*").split(",")

    # ── LLM / Chatbot ─────────────────────────────────────────────────────────
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "groq")  # groq | openai
    LLM_MODEL: str = os.getenv("LLM_MODEL", "")  # empty = provider default
    LLM_TIMEOUT: int = int(os.getenv("LLM_TIMEOUT", "30"))

    # ── Logging ───────────────────────────────────────────────────────────────
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = "[%(asctime)s] %(levelname)s in %(module)s: %(message)s"


class DevelopmentConfig(BaseConfig):
    """Local development — verbose, permissive."""
    DEBUG = True
    SQLALCHEMY_ECHO = False   # Set True to see raw SQL in terminal


class TestingConfig(BaseConfig):
    """In-memory DB for unit tests — never persists to disk."""
    TESTING = True
    ML_INFERENCE_ENABLED = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    # MODEL_PATH intentionally inherited from BaseConfig — points to the
    # real trained artifact so inference tests work without re-training.


class ProductionConfig(BaseConfig):
    """Production — strict. All secrets MUST come from env vars."""
    # Evaluated lazily at runtime, not at import time, to avoid crashes
    # when running tests or dev server without a production .env.
    SECRET_KEY: str = os.environ.get("SECRET_KEY", BaseConfig.SECRET_KEY)
    CORS_ORIGINS: list = os.environ.get("CORS_ORIGINS", "").split(",")


# ─── Config Registry ───────────────────────────────────────────────────────────
_CONFIG_MAP = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}

def get_config() -> BaseConfig:
    """
    Returns the appropriate config class based on the FLASK_ENV
    environment variable. Defaults to DevelopmentConfig.
    """
    env = os.getenv("FLASK_ENV", "development").lower()
    return _CONFIG_MAP.get(env, DevelopmentConfig)
