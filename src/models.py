"""
src/models.py — SQLAlchemy ORM Models
=======================================
Database schema designed with authentication and session security.
Users are identified by email and protected by password hashing.
Sessions are managed via database-backed secure tokens.
"""

import secrets
from datetime import datetime, date
from typing import Optional

from sqlalchemy import (
    String, Integer, Float, Date, Text,
    DateTime, ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from werkzeug.security import generate_password_hash, check_password_hash

# Flask-SQLAlchemy's db instance (avoids circular imports — db is defined in extensions.py)
from src.extensions import db


# ─── User Model ───────────────────────────────────────────────────────────────
class User(db.Model):
    """
    Represents an authenticated application user.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    email: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False,
        index=True,
        comment="User email address for login"
    )
    
    password_hash: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        comment="PBKDF2 password hash"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        comment="UTC timestamp of account creation"
    )

    # Used solely to compute gestational week on the server side
    due_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="Estimated due date (EDD) for gestational week computation"
    )

    # Bidirectional relationship — cascade deletes orphan logs
    logs: Mapped[list["DailyLog"]] = relationship(
        "DailyLog",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select"
    )

    sessions: Mapped[list["UserSession"]] = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select"
    )

    def set_password(self, password: str) -> None:
        """Hashes password and stores it."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verifies a plain text password against the hashed value."""
        return check_password_hash(self.password_hash, password)

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} due={self.due_date}>"

    def to_dict(self) -> dict:
        return {
            "user_id": self.id,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
            "due_date": self.due_date.isoformat() if self.due_date else None,
        }


# ─── User Session Model ───────────────────────────────────────────────────────
class UserSession(db.Model):
    """
    Represents an active, authenticated API session.
    """
    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    token: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        nullable=False,
        index=True,
        comment="Secure session token"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        comment="Expiration timestamp for the session"
    )

    # Relationship back to user
    user: Mapped["User"] = relationship("User", back_populates="sessions")

    @classmethod
    def generate_token(cls) -> str:
        """Generates a secure cryptographically strong random token."""
        return secrets.token_urlsafe(64)

    def __repr__(self) -> str:
        return f"<UserSession id={self.id} user_id={self.user_id} expired={self.expires_at < datetime.utcnow()}>"


# ─── Daily Log Model ──────────────────────────────────────────────────────────
class DailyLog(db.Model):
    """
    A single day's wellness tracking entry for a user.

    Each row captures biometric and behavioural inputs that feed
    the ML model, storing both raw inputs and the model's output
    prediction (predicted_stress_index) for trend analysis.
    """
    __tablename__ = "daily_logs"
    __table_args__ = (
        # Prevent duplicate entries for the same user on the same date
        UniqueConstraint("user_id", "log_date", name="uq_user_date"),
        # Data integrity constraints matching input validation rules
        CheckConstraint("gestational_week BETWEEN 1 AND 42", name="ck_gestational_week"),
        CheckConstraint("sleep_hours BETWEEN 0 AND 24",       name="ck_sleep_hours"),
        CheckConstraint("water_liters BETWEEN 0 AND 10",      name="ck_water_liters"),
        CheckConstraint("symptom_score BETWEEN 1 AND 5",      name="ck_symptom_score"),
        CheckConstraint("mood_score BETWEEN 1 AND 5",         name="ck_mood_score"),
        CheckConstraint(
            "predicted_stress_index IS NULL OR predicted_stress_index BETWEEN 0.0 AND 10.0",
            name="ck_prediction_range"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Date the log is for (allows backdating within reason)
    log_date: Mapped[date] = mapped_column(
        Date,
        default=date.today,
        nullable=False
    )

    # ── ML Feature Columns ────────────────────────────────────────────────────
    gestational_week: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Weeks since last menstrual period (1–42)"
    )

    sleep_hours: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="Total sleep the previous night in hours"
    )

    water_liters: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="Total water consumed during the day in litres"
    )

    symptom_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Self-reported physical symptom severity (1=none, 5=severe)"
    )

    mood_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Self-reported anxiety/mood level (1=calm, 5=very anxious)"
    )

    # HRV delta is optional — wearable-provided, imputed server-side if absent
    hrv_delta: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Heart Rate Variability deviation from personal baseline (ms)"
    )

    # ── Model Output ──────────────────────────────────────────────────────────
    predicted_stress_index: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Model-predicted Well-being Index (0–10; lower = more at-risk)"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    # Relationship back to parent user
    user: Mapped["User"] = relationship("User", back_populates="logs")

    def __repr__(self) -> str:
        return (
            f"<DailyLog id={self.id} user={self.user_id} "
            f"date={self.log_date} index={self.predicted_stress_index}>"
        )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "log_date": self.log_date.isoformat(),
            "gestational_week": self.gestational_week,
            "sleep_hours": self.sleep_hours,
            "water_liters": self.water_liters,
            "symptom_score": self.symptom_score,
            "mood_score": self.mood_score,
            "hrv_delta": self.hrv_delta,
            "predicted_stress_index": self.predicted_stress_index,
            "created_at": self.created_at.isoformat(),
        }


# ─── Forum Post Model ─────────────────────────────────────────────────────────
class ForumPost(db.Model):
    """Anonymous community forum thread starter."""
    __tablename__ = "forum_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    client_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
        comment="Anonymous device UUID tracking authorship",
    )

    category: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    replies: Mapped[list["ForumReply"]] = relationship(
        "ForumReply",
        back_populates="post",
        cascade="all, delete-orphan",
        lazy="select",
        order_by="ForumReply.created_at.asc()",
    )

    def to_dict(self, *, viewer_client_id: Optional[str] = None, include_replies: bool = False) -> dict:
        data = {
            "id": self.id,
            "category": self.category,
            "title": self.title,
            "content": self.content,
            "created_at": self.created_at.isoformat() + "Z",
            "reply_count": len(self.replies),
            "is_mine": viewer_client_id is not None and self.client_id == viewer_client_id,
            "author_label": "You" if viewer_client_id and self.client_id == viewer_client_id else "Anonymous",
        }
        if include_replies:
            data["replies"] = [
                r.to_dict(viewer_client_id=viewer_client_id) for r in self.replies
            ]
        return data


# ─── Forum Reply Model ────────────────────────────────────────────────────────
class ForumReply(db.Model):
    """Reply nested under a forum post."""
    __tablename__ = "forum_replies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    post_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("forum_posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    client_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
    )

    content: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    post: Mapped["ForumPost"] = relationship("ForumPost", back_populates="replies")

    def to_dict(self, *, viewer_client_id: Optional[str] = None) -> dict:
        return {
            "id": self.id,
            "post_id": self.post_id,
            "content": self.content,
            "created_at": self.created_at.isoformat() + "Z",
            "is_mine": viewer_client_id is not None and self.client_id == viewer_client_id,
            "author_label": "You" if viewer_client_id and self.client_id == viewer_client_id else "Anonymous",
        }
