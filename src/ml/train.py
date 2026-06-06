"""
src/ml/train.py — ML Training Pipeline
=========================================
Trains a Gradient Boosting Regressor (scikit-learn's HistGradientBoosting,
which natively handles missing values without imputation) to predict the
Maternal Well-being Index from daily tracking features.

Pipeline steps:
  1. Load & validate synthetic CSV data
  2. Feature engineering (trimester binning)
  3. Preprocessing: StandardScaler for tree-compatible normalisation
  4. Model training: HistGradientBoostingRegressor (handles NaN natively)
  5. Evaluation: MAE, RMSE, R², 5-fold cross-validation
  6. Serialise model + scaler + metrics to src/ml/artifacts/

Usage:
    python src/ml/train.py [--data PATH] [--n-estimators 300] [--seed 42]
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, root_mean_squared_error
from sklearn.model_selection import KFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# ─── Paths ────────────────────────────────────────────────────────────────────
_HERE           = Path(__file__).parent
DATA_PATH       = _HERE / "data"  / "synthetic_maternal_data.csv"
ARTIFACTS_DIR   = _HERE / "artifacts"
MODEL_PATH      = ARTIFACTS_DIR / "wellbeing_model.joblib"
SCALER_PATH     = ARTIFACTS_DIR / "feature_scaler.joblib"
METRICS_PATH    = ARTIFACTS_DIR / "model_metrics.json"

ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

# ─── Feature / Target definition ─────────────────────────────────────────────
FEATURE_COLS = [
    "gestational_week",
    "sleep_hours",
    "water_liters",
    "symptom_score",
    "mood_score",
    "hrv_delta",        # may contain NaN — handled natively by the model
    "trimester",        # engineered feature (1/2/3)
]
TARGET_COL = "wellbeing_index"

logging.basicConfig(level=logging.INFO, format="%(levelname)s │ %(message)s")
log = logging.getLogger(__name__)


# ─── Feature Engineering ─────────────────────────────────────────────────────
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds derived features on top of the raw input columns.

    trimester (int 1/2/3):
        Binned gestational week — a clinically meaningful categorical
        that the model can use to capture trimester-level patterns.

    sleep_deficit (float):
        Difference between recommended 8h and actual sleep hours.
        Negative = oversleeping (also mildly detrimental in late pregnancy).
    """
    df = df.copy()
    df["trimester"] = pd.cut(
        df["gestational_week"],
        bins=[0, 13, 26, 42],
        labels=[1, 2, 3]
    ).astype(int)

    df["sleep_deficit"] = 8.0 - df["sleep_hours"]   # positive = under-slept

    # Add to feature list if not already present
    if "sleep_deficit" not in FEATURE_COLS:
        FEATURE_COLS.append("sleep_deficit")

    return df


# ─── Data Loading ────────────────────────────────────────────────────────────
def load_data(path: Path) -> tuple[pd.DataFrame, pd.Series]:
    """Loads and validates the dataset, returning (X, y)."""
    log.info("Loading data from: %s", path)
    df = pd.read_csv(path)

    required = set(["gestational_week", "sleep_hours", "water_liters",
                    "symptom_score", "mood_score", "wellbeing_index"])
    missing_cols = required - set(df.columns)
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")

    df = engineer_features(df)

    X = df[[c for c in FEATURE_COLS if c in df.columns]]
    y = df[TARGET_COL]

    log.info("Loaded %d samples, %d features.", len(X), X.shape[1])
    log.info("Target range: [%.2f, %.2f]  mean=%.2f", y.min(), y.max(), y.mean())
    return X, y


# ─── Model Building ──────────────────────────────────────────────────────────
def build_pipeline(n_estimators: int, seed: int) -> Pipeline:
    """
    Constructs a scikit-learn Pipeline with:

    1. StandardScaler — normalises feature magnitudes so the boosting
       algorithm converges consistently regardless of feature scale.
       (Tree methods are scale-invariant, but the scaler is kept for
       future compatibility with linear meta-models.)

    2. HistGradientBoostingRegressor — histogram-based gradient boosting
       chosen over vanilla GradientBoostingRegressor because:
       - Native NaN handling (no manual imputation for hrv_delta)
       - Significantly faster on medium datasets (O(n) bin assignment)
       - Built-in early stopping support
       - Comparable accuracy to XGBoost / LightGBM without extra deps
    """
    model = HistGradientBoostingRegressor(
        max_iter=n_estimators,
        learning_rate=0.05,
        max_depth=6,
        min_samples_leaf=20,
        l2_regularization=0.1,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=25,
        random_state=seed,
        verbose=0,
    )
    return Pipeline([
        ("scaler", StandardScaler()),
        ("model",  model),
    ])


# ─── Evaluation ──────────────────────────────────────────────────────────────
def evaluate(
    pipeline: Pipeline,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    X_all: pd.DataFrame,
    y_all: pd.Series,
    seed: int,
) -> dict[str, Any]:
    """
    Computes hold-out and cross-validation metrics plus permutation-based
    feature importances (model-agnostic, works with the full Pipeline).
    """
    y_pred = pipeline.predict(X_test)

    mae  = mean_absolute_error(y_test, y_pred)
    rmse = root_mean_squared_error(y_test, y_pred)
    r2   = r2_score(y_test, y_pred)

    log.info("Hold-out  │ MAE=%.4f  RMSE=%.4f  R²=%.4f", mae, rmse, r2)

    # 5-fold cross-validation MAE
    kf = KFold(n_splits=5, shuffle=True, random_state=seed)
    cv_mae = -cross_val_score(pipeline, X_all, y_all,
                               cv=kf, scoring="neg_mean_absolute_error",
                               n_jobs=-1)
    log.info("CV-5 MAE  │ mean=%.4f  std=%.4f", cv_mae.mean(), cv_mae.std())

    # Permutation feature importances (evaluated on hold-out set)
    perm = permutation_importance(
        pipeline, X_test, y_test,
        n_repeats=15, random_state=seed, n_jobs=-1,
        scoring="neg_mean_absolute_error"
    )
    feat_importance = {
        col: round(float(-perm.importances_mean[i]), 6)
        for i, col in enumerate(X_test.columns)
    }
    feat_importance_sorted = dict(
        sorted(feat_importance.items(), key=lambda x: x[1], reverse=True)
    )
    log.info("Feature importances (MAE-based permutation):")
    for feat, imp in feat_importance_sorted.items():
        log.info("  %-22s %.4f", feat, imp)

    # Number of boosting iterations used (with early stopping)
    n_iterations = int(pipeline.named_steps["model"].n_iter_)

    return {
        "holdout": {
            "mae":  round(mae,  4),
            "rmse": round(rmse, 4),
            "r2":   round(r2,   4),
        },
        "cross_validation": {
            "folds": 5,
            "mae_mean": round(float(cv_mae.mean()), 4),
            "mae_std":  round(float(cv_mae.std()),  4),
        },
        "feature_importances": feat_importance_sorted,
        "model_params": {
            "algorithm": "HistGradientBoostingRegressor",
            "n_iterations_used": n_iterations,
            "early_stopping": True,
        },
        "training_samples": len(X_all),
        "test_samples":     len(X_test),
        "feature_columns":  list(X_all.columns),
    }


# ─── Main Training Routine ────────────────────────────────────────────────────
def train(data_path: Path, n_estimators: int = 500, seed: int = 42) -> dict:
    """Full end-to-end training workflow. Returns metrics dict."""

    X, y = load_data(data_path)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=seed
    )
    log.info("Train: %d  │  Test: %d", len(X_train), len(X_test))

    pipeline = build_pipeline(n_estimators, seed)
    log.info("Training HistGradientBoostingRegressor …")
    pipeline.fit(X_train, y_train)
    log.info("Training complete. Iterations used: %d",
             pipeline.named_steps["model"].n_iter_)

    metrics = evaluate(pipeline, X_test, y_test, X, y, seed)

    # ── Serialise ─────────────────────────────────────────────────────────────
    joblib.dump(pipeline, MODEL_PATH, compress=3)
    log.info("✅ Model saved  → %s", MODEL_PATH)

    # Save scaler separately so the inference service can inspect it
    joblib.dump(pipeline.named_steps["scaler"], SCALER_PATH, compress=3)
    log.info("✅ Scaler saved → %s", SCALER_PATH)

    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    log.info("✅ Metrics saved → %s", METRICS_PATH)

    return metrics


# ─── Entry Point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train maternal wellness ML model.")
    parser.add_argument("--data",         type=str, default=str(DATA_PATH))
    parser.add_argument("--n-estimators", type=int, default=500,
                        help="Max boosting iterations (early stopping may reduce this)")
    parser.add_argument("--seed",         type=int, default=42)
    args = parser.parse_args()

    train(Path(args.data), n_estimators=args.n_estimators, seed=args.seed)
