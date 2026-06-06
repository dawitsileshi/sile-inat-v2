"""
src/extensions.py — Shared Flask Extensions
=============================================
Initialises SQLAlchemy outside of the application factory to avoid
circular imports (standard Flask pattern).
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
