#!/usr/bin/env python3
"""
scripts/seed_db.py — Development Database Seeder
==================================================
Creates a sample user and daily logs in the local SQLite database
so you can immediately test the history endpoint and charts without
needing a mobile client.

Usage:
    python scripts/seed_db.py
"""

from __future__ import annotations

import argparse
import random
import sys
from datetime import date, timedelta
from pathlib import Path

# Make src importable when running from project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import create_app
from config import DevelopmentConfig
from src.extensions import db
from src.models import User, DailyLog
from src.services.ml_service import get_ml_service

SEED_EMAIL = "seed-user@maternalwellness.com"
SEED_PASSWORD = "password123"
N_DAYS    = 60   # simulate 60 days of logs


def seed(email: str = SEED_EMAIL, password: str = SEED_PASSWORD, n_days: int = N_DAYS) -> None:
    app = create_app(DevelopmentConfig)

    with app.app_context():
        # Create or retrieve user
        user = db.session.query(User).filter_by(email=email).first()
        if not user:
            user = User(
                email    = email,
                due_date = date.today() + timedelta(weeks=16),
            )
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            print(f"✅ Created seed user: {email} / {password}")
        else:
            print(f"ℹ️  Seed user already exists: {email}")

        ml = get_ml_service()
        added = 0

        for i in range(n_days):
            log_date      = date.today() - timedelta(days=n_days - i - 1)
            gestational_w = max(1, min(40, 20 + i // 7))

            # Simulate a realistic progression: slightly improving over time
            sleep_hours   = round(random.gauss(7.0 + i * 0.01, 1.0), 1)
            water_liters  = round(random.gauss(2.2, 0.4), 2)
            symptom_score = random.randint(1, 4)
            mood_score    = random.randint(1, 4)
            hrv_delta     = round(random.gauss(-4.0, 8.0), 2) if random.random() > 0.1 else None

            # Skip if log already exists for this date
            exists = (
                db.session.query(DailyLog)
                .filter_by(user_id=user.id, log_date=log_date)
                .first()
            )
            if exists:
                continue

            # Run ML prediction
            prediction = None
            if ml and ml.is_ready():
                prediction = ml.predict(
                    gestational_week = gestational_w,
                    sleep_hours      = max(3.0, min(12.0, sleep_hours)),
                    water_liters     = max(0.5, min(5.0, water_liters)),
                    symptom_score    = symptom_score,
                    mood_score       = mood_score,
                    hrv_delta        = hrv_delta,
                )

            log_entry = DailyLog(
                user_id                = user.id,
                log_date               = log_date,
                gestational_week       = gestational_w,
                sleep_hours            = max(3.0, min(12.0, sleep_hours)),
                water_liters           = max(0.5, min(5.0, water_liters)),
                symptom_score          = symptom_score,
                mood_score             = mood_score,
                hrv_delta              = hrv_delta,
                predicted_stress_index = prediction,
            )
            db.session.add(log_entry)
            added += 1

        db.session.commit()
        print(f"✅ Seeded {added} daily logs for user '{email}'.")
        print(f"   Log in to obtain a session token:")
        print(f"   curl -X POST http://localhost:5050/api/auth/login \\")
        print(f"        -H \"Content-Type: application/json\" \\")
        print(f"        -d '{{\"email\": \"{email}\", \"password\": \"{password}\"}}'")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the development database.")
    parser.add_argument("--email",    default=SEED_EMAIL)
    parser.add_argument("--password", default=SEED_PASSWORD)
    parser.add_argument("--n-days",    type=int, default=N_DAYS)
    args = parser.parse_args()
    seed(email=args.email, password=args.password, n_days=args.n_days)
