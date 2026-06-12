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
    String, Integer, Float, Date, Text, Boolean,
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

    # Postpartum stage — drives personalized check-in response
    baby_status: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="'pregnant' | 'born' | 'skip'",
    )

    baby_birth_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="Date the baby was born (only when baby_status == 'born')",
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
            "baby_status": self.baby_status,
            "baby_birth_date": self.baby_birth_date.isoformat() if self.baby_birth_date else None,
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
        # Multiple check-ins per (user, date) are intentionally allowed —
        # a postpartum day can swing wildly between 3am and noon, and forcing
        # one row per day flattens that into a single snapshot. The old
        # uq_user_date unique constraint was dropped via
        # scripts/migrate_drop_daily_log_unique.py.
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

    # Round-2 check-in additions
    feels_supported: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="'yes' | 'somewhat' | 'no' — drives support-options layer in response",
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Free-text 'anything on your mind?' field from the check-in",
    )

    response_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Prose response shown after submit — mood layer + optional stage layer. "
                "Stored at submit time so the journal can replay the exact text she saw.",
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
            "feels_supported": self.feels_supported,
            "notes": self.notes,
            "response_message": self.response_message,
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

    def to_dict(
        self,
        *,
        viewer_client_id: Optional[str] = None,
        include_replies: bool = False,
        reaction_count: int = 0,
        reacted: bool = False,
    ) -> dict:
        data = {
            "id": self.id,
            "category": self.category,
            "title": self.title,
            "content": self.content,
            "created_at": self.created_at.isoformat() + "Z",
            "reply_count": len(self.replies),
            "reaction_count": reaction_count,
            "reacted": reacted,
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


# ─── Forum Reaction Model ─────────────────────────────────────────────────────
class ForumReaction(db.Model):
    """
    Anonymous "I've been there" reaction on a forum post.

    One reaction per (post_id, client_id) — enforced by unique constraint.
    Toggling: insert if absent, delete if present.
    """
    __tablename__ = "forum_reactions"
    __table_args__ = (
        UniqueConstraint("post_id", "client_id", name="uq_forum_reaction"),
    )

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
        comment="Anonymous UUID of the reacting client",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )


# ─── Mother Circle Model ──────────────────────────────────────────────────────
class Circle(db.Model):
    """
    A small, themed group for mothers in a shared moment.

    Topic-anchored, not person-anchored. Capacity-limited so the host
    can actually know who's in the room.
    """
    __tablename__ = "circles"
    __table_args__ = (
        CheckConstraint("capacity > 0", name="ck_circle_capacity_positive"),
        CheckConstraint("member_count >= 0", name="ck_circle_member_count_nonneg"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    phase_tag: Mapped[Optional[str]] = mapped_column(
        String(60),
        nullable=True,
        index=True,
        comment="Phase-of-life filter — e.g. 'Weeks 1–6', 'All phases'",
    )

    is_virtual: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="True for Telegram/video circles; False for in-person",
    )

    capacity: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    member_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    posts: Mapped[list["CirclePost"]] = relationship(
        "CirclePost",
        back_populates="circle",
        cascade="all, delete-orphan",
        lazy="select",
        order_by="CirclePost.created_at.desc()",
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "phase_tag": self.phase_tag,
            "is_virtual": self.is_virtual,
            "capacity": self.capacity,
            "member_count": self.member_count,
            "created_at": self.created_at.isoformat() + "Z",
        }


# ─── Circle Post Model ────────────────────────────────────────────────────────
class CirclePost(db.Model):
    """An anonymous post inside a mother circle."""
    __tablename__ = "circle_posts"
    __table_args__ = (
        CheckConstraint("length(content) <= 280", name="ck_circle_post_length"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    circle_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("circles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    content: Mapped[str] = mapped_column(Text, nullable=False)

    client_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
        comment="Anonymous UUID of the author",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    circle: Mapped["Circle"] = relationship("Circle", back_populates="posts")

    def to_dict(self, *, viewer_client_id: Optional[str] = None) -> dict:
        return {
            "id": self.id,
            "circle_id": self.circle_id,
            "content": self.content,
            "created_at": self.created_at.isoformat() + "Z",
            "is_mine": viewer_client_id is not None and self.client_id == viewer_client_id,
            "author_label": "You" if viewer_client_id and self.client_id == viewer_client_id else "Anonymous",
        }


# ─── Circle Membership Model ──────────────────────────────────────────────────
class CircleMembership(db.Model):
    """
    Tracks which anonymous clients have joined which circles.

    Exists so `/join` is idempotent per UUID and the membership state
    survives the client clearing localStorage. The unique constraint
    is the correctness guarantee — we catch IntegrityError on insert
    to keep the join endpoint safely idempotent.
    """
    __tablename__ = "circle_memberships"
    __table_args__ = (
        UniqueConstraint("circle_id", "client_id", name="uq_circle_membership"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    circle_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("circles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    client_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
    )

    joined_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
