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
    DateTime, ForeignKey, UniqueConstraint, CheckConstraint,
    Index, event, inspect as sa_inspect
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

    Self-reported inputs only. The ML "well-being index" that once scored
    these rows was removed on 2026-09-15 (decisions #1, #8) along with its
    columns (gestational_week, hrv_delta, predicted_stress_index). Nothing
    here is scored. Clinical screening lives in the screening_* tables.
    """
    __tablename__ = "daily_logs"
    __table_args__ = (
        # Multiple check-ins per (user, date) are intentionally allowed —
        # a postpartum day can swing wildly between 3am and noon, and forcing
        # one row per day flattens that into a single snapshot. The old
        # uq_user_date unique constraint was dropped via
        # scripts/migrate_drop_daily_log_unique.py.
        CheckConstraint("sleep_hours BETWEEN 0 AND 24",       name="ck_sleep_hours"),
        CheckConstraint("water_liters BETWEEN 0 AND 10",      name="ck_water_liters"),
        CheckConstraint("symptom_score BETWEEN 1 AND 5",      name="ck_symptom_score"),
        CheckConstraint("mood_score BETWEEN 1 AND 5",         name="ck_mood_score"),
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
            f"date={self.log_date} mood={self.mood_score}>"
        )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "log_date": self.log_date.isoformat(),
            "sleep_hours": self.sleep_hours,
            "water_liters": self.water_liters,
            "symptom_score": self.symptom_score,
            "mood_score": self.mood_score,
            "feels_supported": self.feels_supported,
            "notes": self.notes,
            "response_message": self.response_message,
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


# ══════════════════════════════════════════════════════════════════════════════
# Two-Stage Postpartum Depression Screening (research pilot)
# ══════════════════════════════════════════════════════════════════════════════
#
# Design rules for everything below this line. Read before editing.
#
# 1. TWO TIERS, ONE KEY.
#    Research tier — keyed only by the opaque `participant_id`. Safe to export.
#    Identifiable tier — the re-identification link and the staff follow-up
#    workflow. Never exported. See RESEARCH_EXPORT_MODELS / IDENTIFIABLE_MODELS
#    at the bottom of this section; export code must read those tuples rather
#    than hand-listing tables, so the boundary cannot silently drift.
#
# 2. SAFETY EVENTS ARE APPEND-ONLY.
#    `SafetyEvent` rows cannot be updated or deleted through the ORM — the
#    event listeners at the end of this section raise. Mutable alert state
#    lives in its own append-only attempt log. A disclosure of self-harm is
#    the one thing in this database that must never be lost or rewritten.
#
# 3. CONSENT IS A LOG, NOT A FLAG.
#    Withdrawal is a new row, not an UPDATE. The history is the audit trail.
#
# 4. NO CLINICAL CONTENT IS HARDCODED HERE.
#    Question text, option labels, item counts and scoring bands arrive as
#    versioned content (`ScreeningContentVersion`). These tables record *which
#    version* a participant saw and *what she answered*, nothing more.
#

# ─── Controlled vocabularies ──────────────────────────────────────────────────
# Plain string tuples + CheckConstraints rather than Python/SQL Enums: matches
# the rest of this file, and keeps values readable in a CSV export.

CONSENT_STATUSES = ("accepted", "declined", "withdrawn")

SCREENING_STAGES = (1, 2)
SCREENING_SESSION_STATUSES = ("in_progress", "completed", "abandoned")

# Stage 1 triage tiers. Deliberately not red — see the colour rule in the
# project constitution; "orange" is the highest tier this instrument reports.
STAGE1_TIERS = ("green", "amber", "orange")

# The two places a safety disclosure can originate in the two-stage flow.
SAFETY_TRIGGER_STAGE1 = "stage1_safety_question"
SAFETY_TRIGGER_EPDS_ITEM_10 = "epds_item_10"
SAFETY_TRIGGERS = (SAFETY_TRIGGER_STAGE1, SAFETY_TRIGGER_EPDS_ITEM_10)

SAFETY_ALERT_STATUSES = ("pending", "sent", "acknowledged", "failed")

FOLLOW_UP_STATUSES = (
    "new",
    "contact_pending",
    "contacted",
    "referred",
    "follow_up_scheduled",
    "follow_up_completed",
    "closed",
)

CONTENT_STATUSES = ("draft", "active", "retired")


def _one_of(column: str, values: tuple) -> str:
    """Renders a portable `col IN ('a','b')` CheckConstraint body."""
    rendered = ", ".join(f"'{v}'" for v in values)
    return f"{column} IN ({rendered})"


def new_participant_id() -> str:
    """
    Mints an opaque, unguessable participant ID.

    Not derived from user id, email, device UUID or timestamp — a derivable ID
    would re-identify the research export on its own.
    """
    return secrets.token_urlsafe(24)[:32]


def new_event_uid() -> str:
    """Opaque idempotency key for safety events and screening sessions."""
    return secrets.token_urlsafe(24)[:32]


class ImmutableRecordError(RuntimeError):
    """
    Raised when code attempts to update or delete an append-only record.

    Deliberately a hard error rather than a silent no-op: if a caller thinks
    it is editing a safety event, that caller is wrong and needs to know.
    """


# ─── Screening Content Version ────────────────────────────────────────────────
class ScreeningContentVersion(db.Model):
    """
    RESEARCH TIER.

    The registry of screening content versions. One row per
    (content_key, version, language) — so "Stage 1 v2.0 in Amharic" is a
    distinct, citable row from "Stage 1 v2.0 in English".

    The actual question text is NOT authored here. `payload` is an empty Text
    column waiting for the supplied content bundle (JSON); `checksum` is how a
    pilot report proves the bundle a participant saw is byte-for-byte the
    bundle in the appendix.

    Nothing in the screening flow may fall back to a default when the content
    version is missing — a response with no known provenance is unusable for
    the pilot.
    """
    __tablename__ = "screening_content_versions"
    __table_args__ = (
        UniqueConstraint(
            "content_key", "version", "language",
            name="uq_screening_content_version",
        ),
        CheckConstraint(_one_of("status", CONTENT_STATUSES), name="ck_content_status"),
        CheckConstraint("stage IS NULL OR stage IN (1, 2)", name="ck_content_stage"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    content_key: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
        comment="Instrument identifier, e.g. 'stage1_triage' | 'epds'",
    )

    version: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="Semantic version of the question set, e.g. '1.0.0'",
    )

    language: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        comment="BCP-47 tag of the language this bundle is written in, e.g. 'am' | 'en'",
    )

    stage: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="1 or 2 — which screening stage this content belongs to",
    )

    status: Mapped[str] = mapped_column(
        String(16),
        default="draft",
        nullable=False,
        comment="'draft' | 'active' | 'retired'. Only 'active' may be served.",
    )

    item_count: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Number of items in the bundle. Populated when content is loaded.",
    )

    payload: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Supplied content bundle as JSON — questions, options, scoring "
                "bands, safety-item flags. Authored externally, never generated here.",
    )

    checksum: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        comment="SHA-256 of `payload`. Proves exactly which text was served.",
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Provenance — translator, clinical reviewer, approval date.",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="When this version first became servable.",
    )

    retired_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    @property
    def label(self) -> str:
        """Human-citable identifier, e.g. 'epds@1.2.0/am'."""
        return f"{self.content_key}@{self.version}/{self.language}"

    def __repr__(self) -> str:
        return f"<ScreeningContentVersion {self.label} status={self.status}>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "content_key": self.content_key,
            "version": self.version,
            "language": self.language,
            "stage": self.stage,
            "status": self.status,
            "item_count": self.item_count,
            "checksum": self.checksum,
            "label": self.label,
            "published_at": self.published_at.isoformat() + "Z" if self.published_at else None,
        }


# ─── Screening Participant ────────────────────────────────────────────────────
class ScreeningParticipant(db.Model):
    """
    RESEARCH TIER — the pseudonymous root.

    One row per enrolled participant. `participant_id` is the primary key and
    the *only* key that appears on research rows. It carries no meaning and is
    not derived from anything identifying.

    This row holds nothing that could identify a mother. The identity link, if
    one exists at all, lives in `ScreeningParticipantLink` and can be destroyed
    without touching a single research row.
    """
    __tablename__ = "screening_participants"

    participant_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_participant_id,
        comment="Opaque anonymous participant ID. The join key for all research data.",
    )

    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )

    cohort: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        index=True,
        comment="Pilot cohort / site label, e.g. 'pilot-1-addis'. Coarse by design.",
    )

    preferred_language: Mapped[Optional[str]] = mapped_column(
        String(16),
        nullable=True,
        comment="Language she chose at enrolment. Per-session language is "
                "recorded separately — she may switch mid-study.",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="False once withdrawn or the pilot closes. Rows are never deleted.",
    )

    consents: Mapped[list["ScreeningConsent"]] = relationship(
        "ScreeningConsent",
        back_populates="participant",
        lazy="select",
        order_by="ScreeningConsent.recorded_at.desc()",
        # Never de-associate children on parent delete — let the FK RESTRICT
        # (and the append-only guards) be what refuses.
        passive_deletes="all",
    )

    sessions: Mapped[list["ScreeningSession"]] = relationship(
        "ScreeningSession",
        back_populates="participant",
        lazy="select",
        order_by="ScreeningSession.started_at.asc()",
        passive_deletes="all",
    )

    safety_events: Mapped[list["SafetyEvent"]] = relationship(
        "SafetyEvent",
        back_populates="participant",
        lazy="select",
        order_by="SafetyEvent.occurred_at.asc()",
        passive_deletes="all",
    )

    def __repr__(self) -> str:
        return f"<ScreeningParticipant {self.participant_id} cohort={self.cohort}>"

    def to_dict(self) -> dict:
        return {
            "participant_id": self.participant_id,
            "enrolled_at": self.enrolled_at.isoformat() + "Z",
            "cohort": self.cohort,
            "preferred_language": self.preferred_language,
            "is_active": self.is_active,
        }


# ─── Screening Consent (append-only) ──────────────────────────────────────────
class ScreeningConsent(db.Model):
    """
    RESEARCH TIER — append-only consent log.

    Every consent decision is a NEW ROW. Accepting, declining and withdrawing
    are three kinds of event in one ledger, never an UPDATE to a flag. The
    reason is regulatory: "was she consented at the moment this response was
    collected, and under which wording?" is a question a boolean cannot answer
    after the fact.

    `ScreeningSession.consent_id` pins each screening to the exact consent row
    in force when it was collected, so a later withdrawal does not retroactively
    rewrite the provenance of data already gathered — it stops new collection
    and marks the earlier data for handling under the pilot protocol.

    Updates and deletes raise ImmutableRecordError (see listeners below).
    """
    __tablename__ = "screening_consents"
    __table_args__ = (
        CheckConstraint(_one_of("status", CONSENT_STATUSES), name="ck_consent_status"),
        # Withdrawal timestamp and status must agree. A withdrawal with no
        # timestamp, or a timestamp on an acceptance, is a bug we want loud.
        CheckConstraint(
            "(status = 'withdrawn' AND withdrawn_at IS NOT NULL) "
            "OR (status <> 'withdrawn' AND withdrawn_at IS NULL)",
            name="ck_consent_withdrawal_coherent",
        ),
        Index("ix_consent_participant_time", "participant_id", "recorded_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    participant_id: Mapped[str] = mapped_column(
        String(36),
        # RESTRICT, not CASCADE: a consent record must outlive any attempt to
        # tidy up the participant table.
        ForeignKey("screening_participants.participant_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        comment="'accepted' | 'declined' | 'withdrawn'",
    )

    consent_version: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="Version of the consent wording she was shown, e.g. '1.0.0'. "
                "Required — an unversioned consent is not auditable.",
    )

    content_version_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("screening_content_versions.id", ondelete="RESTRICT"),
        nullable=True,
        comment="The consent-text bundle, when the wording is managed as content.",
    )

    language: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        comment="Language the consent was actually READ IN. Not her profile "
                "language — consent in a language she does not read is not consent.",
    )

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
        comment="When this decision was made. Never edited.",
    )

    withdrawn_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="Set only on rows where status == 'withdrawn'.",
    )

    withdrawal_reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Optional, free text, never required of her.",
    )

    supersedes_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("screening_consents.id", ondelete="RESTRICT"),
        nullable=True,
        comment="The consent row this decision replaces. Makes the chain "
                "explicit instead of inferred from timestamps.",
    )

    participant: Mapped["ScreeningParticipant"] = relationship(
        "ScreeningParticipant", back_populates="consents"
    )
    content_version: Mapped[Optional["ScreeningContentVersion"]] = relationship(
        "ScreeningContentVersion"
    )

    @classmethod
    def current_for(cls, participant_id: str) -> Optional["ScreeningConsent"]:
        """
        The consent decision currently in force. Ordered by (recorded_at, id)
        so rows written in the same instant still resolve deterministically.
        """
        return (
            cls.query
            .filter_by(participant_id=participant_id)
            .order_by(cls.recorded_at.desc(), cls.id.desc())
            .first()
        )

    @classmethod
    def is_active_for(cls, participant_id: str) -> bool:
        """True only if the latest decision is an acceptance."""
        current = cls.current_for(participant_id)
        return current is not None and current.status == "accepted"

    def __repr__(self) -> str:
        return (
            f"<ScreeningConsent id={self.id} participant={self.participant_id} "
            f"status={self.status} v={self.consent_version} lang={self.language}>"
        )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "participant_id": self.participant_id,
            "status": self.status,
            "consent_version": self.consent_version,
            "content_version_id": self.content_version_id,
            "language": self.language,
            "recorded_at": self.recorded_at.isoformat() + "Z",
            "withdrawn_at": self.withdrawn_at.isoformat() + "Z" if self.withdrawn_at else None,
            "supersedes_id": self.supersedes_id,
        }


# ─── Screening Session ────────────────────────────────────────────────────────
class ScreeningSession(db.Model):
    """
    RESEARCH TIER.

    One sitting at one stage. Stage 1 is the brief triage; Stage 2 is the EPDS,
    administered only when Stage 1 indicates it. A participant who completes
    both has two rows linked by `participant_id`, not one row carrying both
    scores — the stages happen at different times, in possibly different
    languages, against independently versioned content.

    Totals and tiers are stored, but they are DERIVED values kept for
    convenience and reproducibility checks. `ScreeningItemResponse` is the
    source of truth; a total that disagrees with its items is a scoring bug,
    and keeping both is how the pilot catches one.

    `screening_version` duplicates the content version as plain text on the
    row. That denormalisation is intentional: a de-identified CSV export must
    be interpretable with no joins and no access to this database.
    """
    __tablename__ = "screening_sessions"
    __table_args__ = (
        CheckConstraint("stage IN (1, 2)", name="ck_screening_stage"),
        CheckConstraint(
            _one_of("status", SCREENING_SESSION_STATUSES),
            name="ck_screening_session_status",
        ),
        CheckConstraint(
            "stage1_tier IS NULL OR " + _one_of("stage1_tier", STAGE1_TIERS),
            name="ck_stage1_tier",
        ),
        # Arithmetic bounds only. No clinical cut-off is asserted anywhere in
        # this file — scoring bands come from the content bundle.
        CheckConstraint(
            "stage1_total_score IS NULL OR stage1_total_score >= 0",
            name="ck_stage1_total_nonneg",
        ),
        CheckConstraint(
            "epds_total_score IS NULL OR epds_total_score BETWEEN 0 AND 30",
            name="ck_epds_total_range",
        ),
        # Stage hygiene: EPDS results may only appear on a stage-2 row, and
        # stage-1 triage results only on a stage-1 row.
        CheckConstraint(
            "stage = 1 OR (stage1_total_score IS NULL AND stage1_tier IS NULL)",
            name="ck_stage1_fields_on_stage1",
        ),
        CheckConstraint(
            "stage = 2 OR (epds_total_score IS NULL AND epds_status IS NULL)",
            name="ck_epds_fields_on_stage2",
        ),
        Index("ix_session_participant_stage", "participant_id", "stage"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    session_uid: Mapped[str] = mapped_column(
        String(36),
        default=new_event_uid,
        unique=True,
        nullable=False,
        index=True,
        comment="Opaque external handle. Lets a client resume or retry without "
                "exposing the autoincrement id, and keeps submits idempotent.",
    )

    participant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("screening_participants.participant_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    consent_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("screening_consents.id", ondelete="RESTRICT"),
        nullable=True,
        comment="The consent row in force when this screening was collected. "
                "Pins provenance so a later withdrawal cannot rewrite history.",
    )

    stage: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="1 = brief triage, 2 = EPDS",
    )

    preceded_by_session_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("screening_sessions.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="For a stage-2 session, the stage-1 session that indicated it. "
                "Makes the two-stage pathway explicit in the data instead of "
                "inferred from participant_id and timestamps, which becomes "
                "ambiguous as soon as anyone re-screens. The pilot needs to "
                "answer 'of those tiered orange, how many completed the EPDS?' "
                "and that question deserves a real edge, not a join on time.",
    )

    language: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        comment="Language this session was actually administered in. She may "
                "switch between stages; that is a finding, not an error.",
    )

    content_version_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("screening_content_versions.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="FK to the exact question bundle served.",
    )

    screening_version: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="Denormalised copy of the content version string. Survives in "
                "a flat export where no join is available.",
    )

    content_checksum: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        comment="Denormalised copy of the bundle checksum, same reasoning.",
    )

    # ── Stage 1 results ───────────────────────────────────────────────────────
    stage1_total_score: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Sum of stage-1 item values. Derived; items are authoritative.",
    )

    stage1_tier: Mapped[Optional[str]] = mapped_column(
        String(16),
        nullable=True,
        index=True,
        comment="'green' | 'amber' | 'orange'. Band boundaries come from the "
                "content bundle, not from this file.",
    )

    # ── Stage 2 (EPDS) results ────────────────────────────────────────────────
    epds_total_score: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="EPDS total, 0-30 (10 items x 0-3). Arithmetic range only.",
    )

    epds_status: Mapped[Optional[str]] = mapped_column(
        String(32),
        nullable=True,
        index=True,
        comment="Scoring band label taken verbatim from the content bundle. "
                "Intentionally unconstrained — this file does not define EPDS "
                "bands and must not become the place someone invents them.",
    )

    # ── Lifecycle ─────────────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(16),
        default="in_progress",
        nullable=False,
        comment="'in_progress' | 'completed' | 'abandoned'. An abandoned "
                "session keeps whatever items she did answer — a safety item "
                "answered before she closed the tab still counts.",
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )

    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    participant: Mapped["ScreeningParticipant"] = relationship(
        "ScreeningParticipant", back_populates="sessions"
    )
    consent: Mapped[Optional["ScreeningConsent"]] = relationship("ScreeningConsent")
    content_version: Mapped[Optional["ScreeningContentVersion"]] = relationship(
        "ScreeningContentVersion"
    )

    responses: Mapped[list["ScreeningItemResponse"]] = relationship(
        "ScreeningItemResponse",
        back_populates="session",
        cascade="all, delete-orphan",
        lazy="select",
        order_by="ScreeningItemResponse.item_index.asc()",
    )

    # NOTE: deliberately no cascade to safety_events. See SafetyEvent.
    safety_events: Mapped[list["SafetyEvent"]] = relationship(
        "SafetyEvent",
        back_populates="session",
        lazy="select",
        passive_deletes="all",
    )

    def __repr__(self) -> str:
        return (
            f"<ScreeningSession {self.session_uid} participant={self.participant_id} "
            f"stage={self.stage} status={self.status}>"
        )

    def to_dict(self, *, include_responses: bool = False) -> dict:
        data = {
            "session_uid": self.session_uid,
            "participant_id": self.participant_id,
            "stage": self.stage,
            "language": self.language,
            "screening_version": self.screening_version,
            "content_checksum": self.content_checksum,
            "stage1_total_score": self.stage1_total_score,
            "stage1_tier": self.stage1_tier,
            "epds_total_score": self.epds_total_score,
            "epds_status": self.epds_status,
            "status": self.status,
            "started_at": self.started_at.isoformat() + "Z",
            "completed_at": self.completed_at.isoformat() + "Z" if self.completed_at else None,
        }
        if include_responses:
            data["responses"] = [r.to_dict() for r in self.responses]
        return data


# ─── Screening Item Response ──────────────────────────────────────────────────
class ScreeningItemResponse(db.Model):
    """
    RESEARCH TIER — one row per question answered.

    Per-item storage is the point of the pilot. A total collapses ten answers
    into one number and makes item-level analysis (which questions translate
    badly into Amharic? which items drive the total?) impossible after the
    fact. There is no way to recover items from a total, so we never store
    only the total.

    Both the numeric value and the option label are kept: the value is what
    scores, the label is what she actually read and chose, in her language. If
    a future content version renumbers its options, the label is how we
    reconstruct what the older answers meant.
    """
    __tablename__ = "screening_item_responses"
    __table_args__ = (
        # One answer per item per session. Re-answering updates this row; the
        # constraint stops a double-submit creating a phantom second answer
        # that would inflate the total.
        UniqueConstraint("session_id", "item_code", name="uq_item_response"),
        Index("ix_item_response_participant", "participant_id", "item_code"),
        Index("ix_item_response_safety", "is_safety_item", "answered_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    session_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("screening_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    participant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("screening_participants.participant_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Denormalised from the session so a de-identified item-level "
                "export needs no join at all.",
    )

    item_code: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
        comment="Stable item identifier from the content bundle, e.g. "
                "'epds_10' or 's1_q3'. Defined by the supplied content.",
    )

    item_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Position in which the item was presented (0-based). Preserved "
                "because presentation order affects responses.",
    )

    item_version: Mapped[Optional[str]] = mapped_column(
        String(32),
        nullable=True,
        comment="Per-item version, for when an item is revised independently "
                "of the bundle. Falls back to the session's screening_version.",
    )

    content_version_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("screening_content_versions.id", ondelete="RESTRICT"),
        nullable=True,
        comment="The bundle this item was served from.",
    )

    response_value: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Scored numeric value of the chosen option. NULL = skipped, "
                "which is distinct from a zero score and must stay distinct.",
    )

    response_label: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="The option text she actually selected, in the language served.",
    )

    response_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Free-text answer, where an item allows one. May contain "
                "identifying detail she volunteered — de-identified exports "
                "must redact or review this column. See EXPORT_REVIEW_COLUMNS.",
    )

    is_safety_item: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="True for the stage-1 safety question and EPDS item 10. Set "
                "from the content bundle's own flag, never guessed from the "
                "item code, so renaming an item cannot silently disarm it.",
    )

    answered_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    session: Mapped["ScreeningSession"] = relationship(
        "ScreeningSession", back_populates="responses"
    )

    def __repr__(self) -> str:
        return (
            f"<ScreeningItemResponse session={self.session_id} "
            f"item={self.item_code} value={self.response_value}>"
        )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "participant_id": self.participant_id,
            "item_code": self.item_code,
            "item_index": self.item_index,
            "item_version": self.item_version,
            "response_value": self.response_value,
            "response_label": self.response_label,
            "is_safety_item": self.is_safety_item,
            "answered_at": self.answered_at.isoformat() + "Z",
        }


# ─── Safety Event (append-only, highest stakes) ───────────────────────────────
class SafetyEvent(db.Model):
    """
    RESEARCH TIER (pseudonymous) — and the most protected table in this schema.

    A row here means a mother disclosed thoughts of harming herself, via the
    stage-1 safety question or EPDS item 10. Every design choice below serves
    one requirement: such a disclosure must never be lost, silently
    overwritten, or made to depend on another table surviving.

    How that is enforced:

    * WRITE-ONCE. The `before_update` and `before_delete` listeners registered
      at the end of this module raise ImmutableRecordError for any change to a
      field in `_IMMUTABLE_FIELDS`, and for any delete at all. The only mutable
      column is `alert_status`, and every change to it should also append a
      `SafetyAlertAttempt` row, so even that has a durable history.

    * SELF-CONTAINED. Stage, language, screening version, item code and the
      triggering answer are all copied onto this row. If the session, the
      response or the content version were somehow lost, this row still says
      what happened and which question caused it.

    * NO CASCADES POINT AT IT. Foreign keys use ondelete="RESTRICT", so
      deleting a participant or a session that produced a safety event fails
      loudly rather than taking the event with it. `ScreeningSession` has no
      delete-orphan cascade to safety events for the same reason.

    * IDEMPOTENT. `event_uid` is unique, so a retried or double-fired submit
      records one event rather than two — which matters because the alerting
      path will hang off this table, and duplicate alerts erode trust in it.

    * NEVER DELETED. Withdrawal of consent does not delete safety events. How
      they are handled on withdrawal is a documented human decision in the
      pilot protocol, not a database cascade.

    Deliberately absent: any contact detail. Reaching the mother goes through
    `ScreeningFollowUp` + `ScreeningParticipantLink`, so this table stays
    exportable and identity stays in exactly one place.
    """
    __tablename__ = "safety_events"
    __table_args__ = (
        CheckConstraint(
            _one_of("trigger_source", SAFETY_TRIGGERS),
            name="ck_safety_trigger_source",
        ),
        CheckConstraint(
            _one_of("alert_status", SAFETY_ALERT_STATUSES),
            name="ck_safety_alert_status",
        ),
        CheckConstraint("stage IN (1, 2)", name="ck_safety_stage"),
        Index("ix_safety_open_alerts", "alert_status", "occurred_at"),
        Index("ix_safety_participant_time", "participant_id", "occurred_at"),
    )

    #: Columns that may never change after INSERT. Enforced by the listener.
    _IMMUTABLE_FIELDS = (
        "event_uid", "participant_id", "session_id", "session_uid",
        "trigger_source", "item_code", "item_response_value",
        "item_response_label", "stage", "language", "screening_version",
        "content_version_id", "occurred_at", "recorded_at",
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    event_uid: Mapped[str] = mapped_column(
        String(36),
        default=new_event_uid,
        unique=True,
        nullable=False,
        index=True,
        comment="Idempotency key. A retried submit must not create a second event.",
    )

    participant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("screening_participants.participant_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    session_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        # RESTRICT: you cannot delete a screening session that produced a
        # safety event. Nullable so an event can still be recorded even if the
        # session row never committed.
        ForeignKey("screening_sessions.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    session_uid: Mapped[Optional[str]] = mapped_column(
        String(36),
        nullable=True,
        comment="Denormalised session handle — survives even if session_id is null.",
    )

    # ── What triggered it ─────────────────────────────────────────────────────
    trigger_source: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        index=True,
        comment="'stage1_safety_question' | 'epds_item_10'",
    )

    item_code: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="The exact item identifier that triggered it, from the bundle.",
    )

    item_response_value: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Scored value of her answer to the triggering item.",
    )

    item_response_label: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="The option she selected, verbatim, in the language served. "
                "Copied here so the event is readable without any join.",
    )

    # ── Context snapshot ──────────────────────────────────────────────────────
    stage: Mapped[int] = mapped_column(Integer, nullable=False)

    language: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        comment="Language the triggering question was administered in.",
    )

    screening_version: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="Denormalised content version string.",
    )

    content_version_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("screening_content_versions.id", ondelete="RESTRICT"),
        nullable=True,
    )

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
        comment="When she answered. Client-reported where available.",
    )

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        comment="When the server persisted it. Differs from occurred_at on a "
                "delayed or offline submit; the gap is itself worth auditing.",
    )

    # ── The one mutable field ─────────────────────────────────────────────────
    alert_status: Mapped[str] = mapped_column(
        String(16),
        default="pending",
        nullable=False,
        comment="'pending' | 'sent' | 'acknowledged' | 'failed'. The ONLY "
                "mutable column on this table. Defaults to 'pending' so an "
                "event written but never dispatched shows as outstanding "
                "rather than looking handled.",
    )

    participant: Mapped["ScreeningParticipant"] = relationship(
        "ScreeningParticipant", back_populates="safety_events"
    )
    session: Mapped[Optional["ScreeningSession"]] = relationship(
        "ScreeningSession", back_populates="safety_events"
    )

    alert_attempts: Mapped[list["SafetyAlertAttempt"]] = relationship(
        "SafetyAlertAttempt",
        back_populates="safety_event",
        lazy="select",
        order_by="SafetyAlertAttempt.attempted_at.asc()",
        passive_deletes="all",
    )

    follow_ups: Mapped[list["ScreeningFollowUp"]] = relationship(
        "ScreeningFollowUp",
        back_populates="safety_event",
        lazy="select",
        passive_deletes="all",
    )

    def record_alert_attempt(
        self,
        *,
        channel: str,
        outcome: str,
        recipient_role: Optional[str] = None,
        error_detail: Optional[str] = None,
    ) -> "SafetyAlertAttempt":
        """
        The ONLY supported way to move `alert_status`.

        Appends the attempt and advances the status together, so the log and
        the status cannot drift apart. Assigning `alert_status` directly is
        refused by a database trigger, which is what makes this the only door
        rather than merely the polite one.

        The explicit flush is load-bearing: SQLAlchemy orders a parent UPDATE
        before a child INSERT (safety_alert_attempts depends on safety_events),
        which would present the trigger with a status change that has no
        backing row yet. Flushing the attempt first fixes the order.

        Does not commit — the caller owns the transaction boundary, so the
        attempt and the status advance land atomically or not at all.
        """
        if outcome not in SAFETY_ALERT_STATUSES:
            raise ValueError(
                f"Unknown alert outcome {outcome!r}; expected one of {SAFETY_ALERT_STATUSES}"
            )

        attempt = SafetyAlertAttempt(
            safety_event_id=self.id,
            channel=channel,
            recipient_role=recipient_role,
            outcome=outcome,
            error_detail=error_detail,
        )
        db.session.add(attempt)
        db.session.flush()          # attempt row must exist before the status moves
        self.alert_status = outcome
        return attempt

    def __repr__(self) -> str:
        return (
            f"<SafetyEvent {self.event_uid} participant={self.participant_id} "
            f"trigger={self.trigger_source} alert={self.alert_status}>"
        )

    def to_dict(self) -> dict:
        return {
            "event_uid": self.event_uid,
            "participant_id": self.participant_id,
            "session_uid": self.session_uid,
            "trigger_source": self.trigger_source,
            "item_code": self.item_code,
            "item_response_value": self.item_response_value,
            "stage": self.stage,
            "language": self.language,
            "screening_version": self.screening_version,
            "occurred_at": self.occurred_at.isoformat() + "Z",
            "recorded_at": self.recorded_at.isoformat() + "Z",
            "alert_status": self.alert_status,
        }


# ─── Safety Alert Attempt (append-only) ───────────────────────────────────────
class SafetyAlertAttempt(db.Model):
    """
    RESEARCH TIER — append-only log of every attempt to raise the alarm.

    `SafetyEvent.alert_status` is a single mutable word; this is the evidence
    behind it. One row per dispatch attempt, including failures. Without it,
    "alert_status = sent" is an unverifiable claim, and a silently failing
    notification channel looks identical to a working one.

    Never updated, never deleted.
    """
    __tablename__ = "safety_alert_attempts"
    __table_args__ = (
        CheckConstraint(
            _one_of("outcome", SAFETY_ALERT_STATUSES),
            name="ck_alert_attempt_outcome",
        ),
        Index("ix_alert_attempt_event_time", "safety_event_id", "attempted_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    safety_event_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("safety_events.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    channel: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="How the alert was attempted, e.g. 'sms' | 'email' | 'dashboard'.",
    )

    recipient_role: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        comment="Role notified, e.g. 'on_call_clinician'. A ROLE, never a "
                "person and never an address — addresses are identifiable and "
                "belong in the operational tier, not on a research row.",
    )

    outcome: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        comment="'pending' | 'sent' | 'acknowledged' | 'failed'",
    )

    error_detail: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Provider error on failure. No message body, no contact details.",
    )

    attempted_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )

    safety_event: Mapped["SafetyEvent"] = relationship(
        "SafetyEvent", back_populates="alert_attempts"
    )

    def __repr__(self) -> str:
        return (
            f"<SafetyAlertAttempt event={self.safety_event_id} "
            f"channel={self.channel} outcome={self.outcome}>"
        )


# ─── Screening Follow-Up (identifiable / operational tier) ────────────────────
class ScreeningFollowUp(db.Model):
    """
    IDENTIFIABLE TIER — the staff workflow. NEVER in a research export.

    Tracks what a human did about a screening result or a safety event: who
    owns it, what state it is in, when the follow-up is due.

    It sits in the identifiable tier even though its key is the anonymous
    participant ID, for two reasons: it names staff, and `outcome_note` is
    free text written by a person who has just spoken to the mother — the
    single most likely place for an identifying detail to end up.

    The status field is mutable by design; this IS the mutable workflow. Every
    transition should append a `FollowUpTransition` row, so the history
    survives even though the current state moves.
    """
    __tablename__ = "screening_follow_ups"
    __table_args__ = (
        CheckConstraint(
            _one_of("status", FOLLOW_UP_STATUSES),
            name="ck_follow_up_status",
        ),
        CheckConstraint(
            "status <> 'closed' OR closed_at IS NOT NULL",
            name="ck_follow_up_closed_has_timestamp",
        ),
        Index("ix_follow_up_open_queue", "status", "follow_up_date"),
        Index("ix_follow_up_assignee", "assigned_staff_id", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    participant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("screening_participants.participant_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    safety_event_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("safety_events.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="Set when this follow-up was opened by a safety disclosure. "
                "RESTRICT so closing paperwork can never delete the event.",
    )

    session_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("screening_sessions.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="Set when opened by a screening result rather than a disclosure.",
    )

    status: Mapped[str] = mapped_column(
        String(32),
        default="new",
        nullable=False,
        index=True,
        comment="new | contact_pending | contacted | referred | "
                "follow_up_scheduled | follow_up_completed | closed",
    )

    # ── Assignment ────────────────────────────────────────────────────────────
    assigned_staff_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        index=True,
        comment="Staff identifier. Nullable — an unassigned row in 'new' is a "
                "valid and important state: it means nobody has picked it up.",
    )

    assigned_staff_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    assigned_staff_role: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        comment="e.g. 'midwife' | 'counsellor' | 'supervising_clinician'",
    )

    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # ── Scheduling ────────────────────────────────────────────────────────────
    follow_up_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        index=True,
        comment="The date the follow-up is due. Date, not datetime — the pilot "
                "schedules by day, and false precision invites missed slots.",
    )

    contacted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    referral_destination: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        comment="Where she was referred, once status reaches 'referred'.",
    )

    outcome_note: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Free text written by staff. ASSUME THIS CONTAINS IDENTIFYING "
                "DETAIL. Never exported, never surfaced to the participant.",
    )

    opened_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )

    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    safety_event: Mapped[Optional["SafetyEvent"]] = relationship(
        "SafetyEvent", back_populates="follow_ups"
    )
    session: Mapped[Optional["ScreeningSession"]] = relationship("ScreeningSession")

    transitions: Mapped[list["FollowUpTransition"]] = relationship(
        "FollowUpTransition",
        back_populates="follow_up",
        lazy="select",
        order_by="FollowUpTransition.changed_at.asc()",
        passive_deletes="all",
    )

    def __repr__(self) -> str:
        return (
            f"<ScreeningFollowUp id={self.id} participant={self.participant_id} "
            f"status={self.status} due={self.follow_up_date}>"
        )


# ─── Follow-Up Transition (append-only) ───────────────────────────────────────
class FollowUpTransition(db.Model):
    """
    IDENTIFIABLE TIER — append-only audit of follow-up status changes.

    Answers "how long did this sit in 'new' before anyone touched it?", which
    is the question that matters most when a safety follow-up goes wrong, and
    which a mutable status column alone cannot answer.

    Never updated, never deleted.
    """
    __tablename__ = "follow_up_transitions"
    __table_args__ = (
        CheckConstraint(
            _one_of("to_status", FOLLOW_UP_STATUSES),
            name="ck_transition_to_status",
        ),
        Index("ix_transition_followup_time", "follow_up_id", "changed_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    follow_up_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("screening_follow_ups.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    from_status: Mapped[Optional[str]] = mapped_column(
        String(32),
        nullable=True,
        comment="NULL on the opening row.",
    )

    to_status: Mapped[str] = mapped_column(String(32), nullable=False)

    changed_by: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        comment="Staff identifier, or NULL for a system transition.",
    )

    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    changed_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )

    follow_up: Mapped["ScreeningFollowUp"] = relationship(
        "ScreeningFollowUp", back_populates="transitions"
    )

    def __repr__(self) -> str:
        return (
            f"<FollowUpTransition follow_up={self.follow_up_id} "
            f"{self.from_status} -> {self.to_status}>"
        )


# ─── Participant Identity Link (identifiable tier — the only re-id path) ──────
class ScreeningParticipantLink(db.Model):
    """
    IDENTIFIABLE TIER — the ONLY table that can re-identify a participant.

    This is the whole separation strategy in one object. Every other screening
    table knows a mother as an opaque string. This table, and only this table,
    knows that the string belongs to an app account or a phone number.

    Consequences that make the design worth it:

    * Deleting a row here de-identifies the participant permanently and
      irreversibly, while leaving every research row — and every safety event —
      intact and still internally consistent.

    * `user_id` cascades on user delete: if a mother deletes her app account,
      the link evaporates automatically and her screening data becomes
      genuinely anonymous rather than merely unlabelled.

    * A de-identified export is produced by never selecting from this table.
      Not by scrubbing columns afterwards — scrubbing is a step someone can
      forget, and a forgotten scrub is silent.

    * It should sit under stricter access control than the research tables,
      ideally a separate schema or database once the pilot outgrows one
      Postgres instance. Until then the separation is structural rather than
      enforced by the engine, and the protocol should say so plainly.
    """
    __tablename__ = "screening_participant_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    participant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("screening_participants.participant_id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
        index=True,
        comment="One identity link per participant, at most.",
    )

    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        # CASCADE here and nowhere else in this section: account deletion
        # should destroy the ability to re-identify, and nothing more.
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="App account, when she screened while signed in. NULL for a "
                "fully anonymous participant, which is the preferred state.",
    )

    client_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        nullable=True,
        comment="Anonymous device UUID (X-Anonymous-Client-Id). A quasi-identifier: "
                "it would link her forum and circle activity to her screening, so "
                "it belongs on this side of the wall.",
    )

    contact_name: Mapped[Optional[str]] = mapped_column(
        String(120),
        nullable=True,
        comment="Only what she gave for follow-up. Never required to screen.",
    )

    contact_phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    contact_method: Mapped[Optional[str]] = mapped_column(
        String(32),
        nullable=True,
        comment="How she agreed to be contacted, e.g. 'phone' | 'sms' | 'none'. "
                "'none' is a valid and respected answer.",
    )

    contact_window: Mapped[Optional[str]] = mapped_column(
        String(120),
        nullable=True,
        comment="When it is safe to call — she may not be alone at all hours.",
    )

    contact_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="Set when the link is retired but the row is kept briefly for "
                "audit. A revoked link must not be used to contact anyone; "
                "purging the row is the permanent form of the same action.",
    )

    def __repr__(self) -> str:
        # No contact details in the repr — reprs end up in logs.
        return (
            f"<ScreeningParticipantLink participant={self.participant_id} "
            f"user_id={self.user_id} revoked={self.revoked_at is not None}>"
        )


# ─── Screening Access Token (identifiable tier — the bearer credential) ──────
class ScreeningAccessToken(db.Model):
    """
    IDENTIFIABLE TIER — how an anonymous browser proves which participant it is.

    Screening has no login, so something has to say "this request belongs to
    participant X". Three candidates were considered and two rejected:

    * `X-Anonymous-Client-Id` (the existing device UUID) — rejected. It is the
      same identifier the forum and circles use. Keying screening off it would
      make her screening record and her forum posts the same identity, which is
      precisely the linkage `ScreeningParticipantLink` exists to prevent.

    * `participant_id` itself — rejected. It is unguessable enough, but it is
      also the research join key printed in every de-identified export. A
      leaked export would then double as a set of working API credentials.

    * A separate opaque token — chosen. It is a credential and nothing else.
      It can be revoked, rotated, or expired without disturbing a single
      research row, and it never appears in an export.

    The token is held only by her browser. We cannot recover it for her, which
    is the cost of not asking who she is.
    """
    __tablename__ = "screening_access_tokens"
    __table_args__ = (
        Index("ix_screening_token_participant", "participant_id", "revoked_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    token: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        nullable=False,
        index=True,
        comment="Opaque bearer credential sent as X-Screening-Token.",
    )

    participant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("screening_participants.participant_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    last_seen_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="Updated on use. Coarse liveness signal for the pilot, not analytics.",
    )

    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="Set on withdrawal. A revoked token authenticates nothing, so "
                "withdrawing also closes the door this browser came through.",
    )

    participant: Mapped["ScreeningParticipant"] = relationship("ScreeningParticipant")

    @classmethod
    def generate_token(cls) -> str:
        """64 urlsafe chars. Matches the UserSession.generate_token convention."""
        return secrets.token_urlsafe(48)

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None

    def __repr__(self) -> str:
        # Never log the token value.
        return (
            f"<ScreeningAccessToken participant={self.participant_id} "
            f"active={self.is_active}>"
        )


# ─── Append-only enforcement ──────────────────────────────────────────────────
# ORM-level guards — the FIRST of two layers. These fire regardless of database
# engine, which matters because SQLite does not enforce FK ondelete rules
# unless PRAGMA foreign_keys is ON. They give a clear Python exception at the
# point of the mistake, which is what a developer actually wants to read.
#
# They do NOT cover bulk operations (`session.execute(update(...))`,
# `query.delete()`, raw `text(...)`) or any client other than this app. That
# gap is closed by the database triggers at the end of this module — see
# "Database-level guards". Neither layer is sufficient alone.

def _guard_immutable_fields(target, fields, label: str) -> None:
    state = sa_inspect(target)
    for field in fields:
        if state.attrs[field].history.has_changes():
            raise ImmutableRecordError(
                f"{label} is append-only: cannot modify '{field}' "
                f"after it has been recorded."
            )


@event.listens_for(SafetyEvent, "before_update")
def _safety_event_before_update(mapper, connection, target):
    _guard_immutable_fields(target, SafetyEvent._IMMUTABLE_FIELDS, "SafetyEvent")


@event.listens_for(SafetyEvent, "before_delete")
def _safety_event_before_delete(mapper, connection, target):
    raise ImmutableRecordError(
        "SafetyEvent rows are never deleted. If the pilot protocol requires "
        "removal after consent withdrawal, that is a documented, supervised "
        "operation — not an ORM delete."
    )


@event.listens_for(ScreeningConsent, "before_update")
def _consent_before_update(mapper, connection, target):
    raise ImmutableRecordError(
        "ScreeningConsent is an append-only log. Record a new row "
        "(status='withdrawn') instead of editing an existing decision."
    )


@event.listens_for(ScreeningConsent, "before_delete")
def _consent_before_delete(mapper, connection, target):
    raise ImmutableRecordError("ScreeningConsent rows are never deleted.")


@event.listens_for(SafetyAlertAttempt, "before_update")
def _alert_attempt_before_update(mapper, connection, target):
    raise ImmutableRecordError(
        "SafetyAlertAttempt is append-only. Append a new attempt row."
    )


@event.listens_for(SafetyAlertAttempt, "before_delete")
def _alert_attempt_before_delete(mapper, connection, target):
    raise ImmutableRecordError("SafetyAlertAttempt rows are never deleted.")


@event.listens_for(FollowUpTransition, "before_update")
def _transition_before_update(mapper, connection, target):
    raise ImmutableRecordError(
        "FollowUpTransition is append-only. Append a new transition row."
    )


@event.listens_for(FollowUpTransition, "before_delete")
def _transition_before_delete(mapper, connection, target):
    raise ImmutableRecordError("FollowUpTransition rows are never deleted.")


# ─── Export boundary ──────────────────────────────────────────────────────────
# Export code must read these tuples rather than hand-listing tables, so that
# adding a model forces a conscious decision about which side of the wall it
# belongs on. A new screening model appearing in neither tuple should fail the
# export loudly rather than default into it.

RESEARCH_EXPORT_MODELS = (
    ScreeningParticipant,
    ScreeningConsent,
    ScreeningContentVersion,
    ScreeningSession,
    ScreeningItemResponse,
    SafetyEvent,
    SafetyAlertAttempt,
)

IDENTIFIABLE_MODELS = (
    ScreeningParticipantLink,
    ScreeningFollowUp,
    FollowUpTransition,
    ScreeningAccessToken,
)

#: Columns inside the research tier that may still carry volunteered
#: identifying detail. A de-identified export must redact or human-review
#: these; excluding IDENTIFIABLE_MODELS alone is not sufficient.
EXPORT_REVIEW_COLUMNS = (
    ("screening_item_responses", "response_text"),
    ("safety_events", "item_response_label"),
)


# ─── Database-level guards (triggers) ─────────────────────────────────────────
#
# The ORM listeners above only fire on the unit-of-work flush path. They are
# bypassed by `session.execute(update(...))`, `query.delete()`, raw
# `text("UPDATE ...")`, and by any client that is not this application at all
# (psql, a migration script, a DBA session). For ordinary tables that is an
# acceptable trade-off. For a record of a mother disclosing self-harm it is not.
#
# So the same rules are enforced a second time as database triggers, emitted on
# table creation for both dialects this project runs on: SQLite locally,
# PostgreSQL on Render. A trigger cannot be bypassed by the connection that
# wrote the statement — only by someone with DDL rights who drops it first,
# which is an audited, deliberate act rather than a stray UPDATE.
#
# Rules enforced below:
#   safety_events          — no DELETE; no UPDATE to any immutable column;
#                            alert_status may only move to the outcome of the
#                            most recent safety_alert_attempts row.
#   safety_alert_attempts  — no UPDATE, no DELETE.
#   screening_consents     — no UPDATE, no DELETE.
#   follow_up_transitions  — no UPDATE, no DELETE.
#
# NOTE: triggers are emitted by `after_create`, so they only exist on tables
# this code created. Adding them to an already-populated database requires the
# reset procedure in sessions/memory/project-deployment.md.

#: Columns on safety_events that the database itself refuses to change.
#: Kept in sync with SafetyEvent._IMMUTABLE_FIELDS — asserted at import time.
_SAFETY_IMMUTABLE_COLUMNS = SafetyEvent._IMMUTABLE_FIELDS

assert set(_SAFETY_IMMUTABLE_COLUMNS) <= set(SafetyEvent.__table__.columns.keys()), (
    "SafetyEvent._IMMUTABLE_FIELDS names a column that does not exist"
)


def _changed_predicate(dialect: str, columns) -> str:
    """NULL-safe 'any of these columns changed' test for the given dialect."""
    op = "IS NOT" if dialect == "sqlite" else "IS DISTINCT FROM"
    return " OR ".join(f"OLD.{c} {op} NEW.{c}" for c in columns)


def _latest_attempt_outcome_sql() -> str:
    return (
        "SELECT outcome FROM safety_alert_attempts "
        "WHERE safety_event_id = NEW.id "
        "ORDER BY attempted_at DESC, id DESC LIMIT 1"
    )


def _sqlite_abort_trigger(name: str, table: str, when: str, event_sql: str, message: str) -> str:
    guard = f"WHEN ({when})" if when else ""
    return (
        f"CREATE TRIGGER IF NOT EXISTS {name} "
        f"BEFORE {event_sql} ON {table} FOR EACH ROW {guard} "
        f"BEGIN SELECT RAISE(ABORT, '{message}'); END"
    )


def _pg_abort_trigger(name: str, table: str, when: str, event_sql: str, message: str) -> tuple:
    """Returns (create function, create trigger) for PostgreSQL."""
    condition = f"IF {when} THEN" if when else "IF TRUE THEN"
    fn = (
        f"CREATE OR REPLACE FUNCTION fn_{name}() RETURNS trigger AS $guard$ "
        f"BEGIN {condition} RAISE EXCEPTION '{message}'; END IF; "
        f"RETURN {'OLD' if event_sql == 'DELETE' else 'NEW'}; "
        f"END; $guard$ LANGUAGE plpgsql"
    )
    trg = (
        f"DROP TRIGGER IF EXISTS {name} ON {table}; "
        f"CREATE TRIGGER {name} BEFORE {event_sql} ON {table} "
        f"FOR EACH ROW EXECUTE FUNCTION fn_{name}()"
    )
    return fn, trg


def _emit_append_only_guards(table_name: str, connection, label: str) -> None:
    """Blocks every UPDATE and every DELETE on a fully append-only table."""
    dialect = connection.dialect.name
    msg_u = f"{label} is append-only - UPDATE is refused by the database"
    msg_d = f"{label} is append-only - DELETE is refused by the database"

    if dialect == "sqlite":
        connection.exec_driver_sql(
            _sqlite_abort_trigger(f"trg_{table_name}_no_update", table_name, "", "UPDATE", msg_u)
        )
        connection.exec_driver_sql(
            _sqlite_abort_trigger(f"trg_{table_name}_no_delete", table_name, "", "DELETE", msg_d)
        )
    elif dialect == "postgresql":
        for stmt in _pg_abort_trigger(f"trg_{table_name}_no_update", table_name, "", "UPDATE", msg_u):
            connection.exec_driver_sql(stmt)
        for stmt in _pg_abort_trigger(f"trg_{table_name}_no_delete", table_name, "", "DELETE", msg_d):
            connection.exec_driver_sql(stmt)
    # Other dialects (e.g. an in-memory test harness on an unsupported engine)
    # fall back to the ORM listeners alone. Deliberately silent rather than
    # fatal, so an unusual engine cannot stop the app from starting.


@event.listens_for(SafetyEvent.__table__, "after_create")
def _create_safety_event_guards(target, connection, **kw):
    """Write-once and no-delete enforcement for safety_events."""
    dialect = connection.dialect.name
    changed = _changed_predicate(dialect, _SAFETY_IMMUTABLE_COLUMNS)
    msg_u = "safety_events is write-once - that column cannot be modified once recorded"
    msg_d = "safety_events rows are never deleted"

    if dialect == "sqlite":
        connection.exec_driver_sql(
            _sqlite_abort_trigger("trg_safety_events_immutable", "safety_events",
                                  changed, "UPDATE", msg_u)
        )
        connection.exec_driver_sql(
            _sqlite_abort_trigger("trg_safety_events_no_delete", "safety_events",
                                  "", "DELETE", msg_d)
        )
    elif dialect == "postgresql":
        for stmt in _pg_abort_trigger("trg_safety_events_immutable", "safety_events",
                                      changed, "UPDATE", msg_u):
            connection.exec_driver_sql(stmt)
        for stmt in _pg_abort_trigger("trg_safety_events_no_delete", "safety_events",
                                      "", "DELETE", msg_d):
            connection.exec_driver_sql(stmt)


@event.listens_for(SafetyAlertAttempt.__table__, "after_create")
def _create_alert_attempt_guards(target, connection, **kw):
    """
    Append-only enforcement for the attempts log, plus the coupling that makes
    alert_status and the log unable to drift apart.

    Attached to the attempts table rather than safety_events because the
    coupling trigger references both tables, and create_all emits safety_events
    first (the FK dependency orders them). By the time this fires, both exist.
    """
    _emit_append_only_guards("safety_alert_attempts", connection, "safety_alert_attempts")

    dialect = connection.dialect.name
    op = "IS NOT" if dialect == "sqlite" else "IS DISTINCT FROM"
    # alert_status changed AND it does not equal the newest logged outcome.
    when = (
        f"(OLD.alert_status {op} NEW.alert_status) AND "
        f"(NEW.alert_status {op} ({_latest_attempt_outcome_sql()}))"
    )
    msg = (
        "safety_events.alert_status may only change to the outcome of the most "
        "recent safety_alert_attempts row - append the attempt first"
    )

    if dialect == "sqlite":
        connection.exec_driver_sql(
            _sqlite_abort_trigger("trg_safety_events_alert_backed", "safety_events",
                                  when, "UPDATE OF alert_status", msg)
        )
    elif dialect == "postgresql":
        fn, trg = _pg_abort_trigger("trg_safety_events_alert_backed", "safety_events",
                                    when, "UPDATE OF alert_status", msg)
        connection.exec_driver_sql(fn)
        connection.exec_driver_sql(trg)


@event.listens_for(ScreeningConsent.__table__, "after_create")
def _create_consent_guards(target, connection, **kw):
    _emit_append_only_guards("screening_consents", connection, "screening_consents")


@event.listens_for(FollowUpTransition.__table__, "after_create")
def _create_transition_guards(target, connection, **kw):
    _emit_append_only_guards("follow_up_transitions", connection, "follow_up_transitions")
