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

# Ensure critical directories exist at import time
INSTANCE_DIR.mkdir(exist_ok=True)


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

    # ── ML Artifacts ──────────────────────────────────────────────────────────
    # REMOVED 2026-09-15 (decisions #1, #8). ML_INFERENCE_ENABLED, MODEL_PATH,
    # SCALER_PATH, METRICS_PATH, SYNTH_DATA_PATH, FEATURE_COLUMNS and
    # TARGET_COLUMN all belonged to the retired well-being index. Screening
    # content is versioned in the database, not in a model artifact.

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
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


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
