"""
src/services/ml_service.py — ML Inference Service (Singleton)
===============================================================
Loads the trained model pipeline once at application startup and
exposes a thread-safe predict() method for use by API routes.

Design decisions:
- Singleton pattern (module-level instance) avoids re-loading the
  ~50 MB model file on every request.
- Feature names are preserved so the model's internal column order
  is always respected regardless of request payload key ordering.
- Graceful degradation: if the model file is absent (e.g., training
  hasn't run yet), predict() returns None and logs a clear warning.
"""

from __future__ import annotations

import json
import logging
import threading
from pathlib import Path
from typing import Optional

log = logging.getLogger(__name__)

# Feature columns MUST match the order used during training (train.py)
FEATURE_COLS = [
    "gestational_week",
    "sleep_hours",
    "water_liters",
    "symptom_score",
    "mood_score",
    "hrv_delta",
    "trimester",
    "sleep_deficit",
]


class MLService:
    """
    Singleton-style inference service for the Well-being Index model.

    Thread safety: A threading.Lock guards the lazy-load path so that
    concurrent first requests don't trigger multiple disk reads.
    """

    def __init__(self, model_path: Path, metrics_path: Path) -> None:
        self._model_path   = model_path
        self._metrics_path = metrics_path
        self._pipeline     = None
        self._metrics      = None
        self._lock         = threading.Lock()

    # ─── Lazy Load ────────────────────────────────────────────────────────────
    def _load_model(self) -> None:
        """Loads the model pipeline from disk. Called once, thread-safe."""
        with self._lock:
            if self._pipeline is not None:
                return  # Another thread loaded it while we waited
            if not self._model_path.exists():
                log.warning(
                    "Model file not found at %s. "
                    "Run `python src/ml/train.py` to generate it.",
                    self._model_path
                )
                return
            try:
                import joblib

                log.info("Loading model from %s …", self._model_path)
                self._pipeline = joblib.load(self._model_path)
                log.info("✅ Model loaded successfully.")
            except Exception as exc:
                log.error("Failed to load ML model: %s", exc)
                self._pipeline = None

    def _load_metrics(self) -> None:
        """Loads cached training metrics from disk."""
        if self._metrics is not None:
            return
        if not self._metrics_path.exists():
            log.warning("Metrics file not found at %s.", self._metrics_path)
            return
        with open(self._metrics_path) as f:
            self._metrics = json.load(f)

    def is_ready(self, *, inference_enabled: bool = True) -> bool:
        """Returns True if the model is loaded and ready for inference."""
        if not inference_enabled:
            return False
        if self._pipeline is None:
            self._load_model()
        return self._pipeline is not None

    # ─── Feature Engineering (must mirror train.py) ───────────────────────────
    @staticmethod
    def _build_feature_row(
        gestational_week: int,
        sleep_hours: float,
        water_liters: float,
        symptom_score: int,
        mood_score: int,
        hrv_delta: Optional[float],
    ):
        """
        Constructs a single-row DataFrame matching the exact feature schema
        used during training, including derived features.
        """
        import numpy as np
        import pandas as pd

        trimester = (
            1 if gestational_week <= 13
            else 2 if gestational_week <= 26
            else 3
        )
        sleep_deficit = 8.0 - sleep_hours

        row = {
            "gestational_week": gestational_week,
            "sleep_hours":      sleep_hours,
            "water_liters":     water_liters,
            "symptom_score":    symptom_score,
            "mood_score":       mood_score,
            "hrv_delta":        hrv_delta if hrv_delta is not None else np.nan,
            "trimester":        trimester,
            "sleep_deficit":    sleep_deficit,
        }
        return pd.DataFrame([row], columns=FEATURE_COLS)

    # ─── Public API ───────────────────────────────────────────────────────────
    def predict(
        self,
        gestational_week: int,
        sleep_hours: float,
        water_liters: float,
        symptom_score: int,
        mood_score: int,
        hrv_delta: Optional[float] = None,
    ) -> Optional[float]:
        """
        Runs inference and returns the Well-being Index (0–10).

        Returns None if the model is not yet trained / loaded.
        The returned value is clipped to [0, 10] as a safety guardrail
        against edge-case extrapolation artefacts.
        """
        if not self.is_ready():
            return None

        try:
            import numpy as np

            features = self._build_feature_row(
                gestational_week, sleep_hours, water_liters,
                symptom_score, mood_score, hrv_delta
            )
            raw_prediction = float(self._pipeline.predict(features)[0])
            return round(float(np.clip(raw_prediction, 0.0, 10.0)), 3)
        except Exception as exc:
            log.error("ML prediction failed: %s", exc)
            return None

    def get_metrics(self) -> Optional[dict]:
        """Returns the training metrics dict, loading from disk if needed."""
        self._load_metrics()
        return self._metrics

    def get_stress_label(self, index: float) -> str:
        """
        Maps a numeric Well-being Index to a human-readable risk label.

        Clinical thresholds informed by EPDS (Edinburgh Postnatal
        Depression Scale) equivalence mapping:
          ≤ 3.5  → High Risk
          ≤ 6.5  → Moderate Risk
          > 6.5  → Low Risk / Healthy
        """
        if index <= 3.5:
            return "high_risk"
        elif index <= 6.5:
            return "moderate_risk"
        return "healthy"


# ─── Module-Level Singleton (initialised in app.py) ──────────────────────────
# Paths are overridden at app creation time via create_ml_service()
_service_instance: Optional[MLService] = None


def create_ml_service(model_path: Path, metrics_path: Path) -> MLService:
    """Factory — creates and caches the singleton MLService instance."""
    global _service_instance
    _service_instance = MLService(model_path, metrics_path)
    return _service_instance


def get_ml_service() -> Optional[MLService]:
    """Returns the singleton instance for use inside route handlers."""
    return _service_instance
