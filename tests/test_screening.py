"""
tests/test_screening.py — Consent gate, Stage 1, Stage 2, and the ML guard
==========================================================================

These replace the throwaway verification scripts used while building the
screening feature. They use `create_app(TestingConfig)` so the in-memory URI is
bound before the engine is created — passing the config in is the only safe
pattern here; mutating app.config after create_app() silently keeps the real
on-disk database.

The last class is a regression guard: it fails if the retired ML well-being
index is reintroduced, so "there is exactly one EPDS path" stays true rather
than being a claim someone made once.
"""

import pathlib

import pytest

from app import create_app
from config import TestingConfig
from src.extensions import db as _db

HEADER = "X-Screening-Token"
REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent


@pytest.fixture(scope="module")
def screening_app():
    application = create_app(TestingConfig)
    with application.app_context():
        _db.create_all()
        from src.services.screening_content import sync_content
        sync_content()
        # The 1.0.0 instruments ship active (published for clinical review);
        # the 0.1.0 placeholders ship as drafts. These tests drive the
        # placeholder codes, so they publish it explicitly and
        # test_stage1_draft_not_servable proves the draft gate separately.
        yield application
        _db.session.remove()
        _db.drop_all()


@pytest.fixture(scope="module")
def api(screening_app):
    return screening_app.test_client()


def _publish_instruments(screening_app):
    with screening_app.app_context():
        from src.services.screening_content import publish
        for key in ("stage1_triage", "epds"):
            publish(key, "0.1.0-placeholder", "en")


def _consented(api):
    token = api.post("/api/screening/participants",
                     json={"language": "en"}).get_json()["screening_token"]
    api.post("/api/screening/consent", headers={HEADER: token},
             json={"decision": "accepted", "agreed": True, "language": "en"})
    return token


def _run_stage1(api, token, answers):
    api.get("/api/screening/stage1", headers={HEADER: token})
    for code, value in answers:
        api.post("/api/screening/stage1/answer", headers={HEADER: token},
                 json={"item_code": code, "value": value})
    return api.post("/api/screening/stage1/complete", headers={HEADER: token}).get_json()


class TestConsentGate:
    def test_content_served_per_language(self, api):
        body = api.get("/api/screening/consent/content?language=am").get_json()
        assert body["language"] == "am"
        assert len(body["content"]["sections"]) == 10

    def test_no_language_fallback(self, api):
        assert api.get("/api/screening/consent/content?language=fr").status_code == 400

    def test_screening_requires_token(self, api):
        r = api.get("/api/screening/stage1")
        assert r.status_code == 401
        assert r.get_json()["code"] == "screening_token_missing"

    def test_forged_token_rejected(self, api):
        r = api.get("/api/screening/stage1", headers={HEADER: "not-a-real-token"})
        assert r.status_code == 401

    def test_consent_required_before_screening(self, api):
        token = api.post("/api/screening/participants",
                         json={"language": "en"}).get_json()["screening_token"]
        r = api.get("/api/screening/stage1", headers={HEADER: token})
        assert r.status_code == 403
        assert r.get_json()["code"] == "consent_required"

    def test_accept_requires_ticked_box(self, api):
        token = api.post("/api/screening/participants",
                         json={"language": "en"}).get_json()["screening_token"]
        r = api.post("/api/screening/consent", headers={HEADER: token},
                     json={"decision": "accepted", "agreed": False, "language": "en"})
        assert r.status_code == 400
        assert r.get_json()["code"] == "confirmation_required"

    def test_decline_is_recorded_and_blocks(self, api):
        token = api.post("/api/screening/participants",
                         json={"language": "en"}).get_json()["screening_token"]
        body = api.post("/api/screening/consent", headers={HEADER: token},
                        json={"decision": "declined", "language": "en"}).get_json()
        assert body["consent"]["status"] == "declined"
        assert api.get("/api/screening/stage1", headers={HEADER: token}).status_code == 403

    def test_withdrawal_is_appended_not_edited(self, api, screening_app):
        token = _consented(api)
        api.post("/api/screening/consent/withdraw", headers={HEADER: token},
                 json={"reason": "test"})
        state = api.get("/api/screening/status", headers={HEADER: token}).get_json()
        assert state["consent"]["status"] == "withdrawn"
        with screening_app.app_context():
            from src.models import ScreeningConsent
            rows = ScreeningConsent.query.order_by(ScreeningConsent.id).all()
            statuses = [r.status for r in rows]
            # The acceptance survives; withdrawal is a new row pointing at it.
            assert "accepted" in statuses and "withdrawn" in statuses
            assert rows[-1].supersedes_id is not None


class TestStage1:
    def test_stage1_draft_not_servable(self, api, screening_app):
        """Unpublished clinical content must never reach a participant.

        Asserted by taking every Stage 1 bundle back to 'draft' rather than by
        assuming what ships unpublished — which version is active is a clinical
        decision that changes, but 'a draft is never served' must not.
        """
        token = _consented(api)
        with screening_app.app_context():
            from src.models import ScreeningContentVersion
            rows = ScreeningContentVersion.query.filter_by(
                content_key="stage1_triage", status="active").all()
            restore = [row.id for row in rows]
            for row in rows:
                row.status = "draft"
            _db.session.commit()
        try:
            r = api.get("/api/screening/stage1", headers={HEADER: token})
            assert r.status_code == 409
            assert r.get_json()["code"] == "content_unavailable"
        finally:
            with screening_app.app_context():
                from src.models import ScreeningContentVersion
                for row_id in restore:
                    _db.session.get(ScreeningContentVersion, row_id).status = "active"
                _db.session.commit()

    def test_full_run_and_banding(self, api, screening_app):
        _publish_instruments(screening_app)
        token = _consented(api)
        result = _run_stage1(api, token,
                             [("s1_q1", 0), ("s1_q2", 1), ("s1_q3", 0), ("s1_safety", 0)])
        assert result["total_score"] == 1
        assert result["tier"] == "green"
        assert result["next"] == "end"
        assert result["safety_triggered"] is False

    def test_answer_validation(self, api):
        token = _consented(api)
        api.get("/api/screening/stage1", headers={HEADER: token})
        for payload, code in (
            ({"item_code": "nope", "value": 1}, "unknown_item"),
            ({"item_code": "s1_q1", "value": 99}, "invalid_option"),
            ({"item_code": "s1_q1", "value": "x"}, "invalid_value"),
        ):
            r = api.post("/api/screening/stage1/answer", headers={HEADER: token}, json=payload)
            assert r.get_json()["code"] == code, payload

    def test_incomplete_cannot_be_scored(self, api):
        token = _consented(api)
        api.get("/api/screening/stage1", headers={HEADER: token})
        api.post("/api/screening/stage1/answer", headers={HEADER: token},
                 json={"item_code": "s1_q1", "value": 1})
        r = api.post("/api/screening/stage1/complete", headers={HEADER: token})
        assert r.status_code == 409
        assert r.get_json()["code"] == "incomplete"

    def test_safety_disclosure_records_event_and_overrides_band(self, api, screening_app):
        token = _consented(api)
        api.get("/api/screening/stage1", headers={HEADER: token})
        for code in ("s1_q1", "s1_q2", "s1_q3"):
            api.post("/api/screening/stage1/answer", headers={HEADER: token},
                     json={"item_code": code, "value": 0})
        answered = api.post("/api/screening/stage1/answer", headers={HEADER: token},
                            json={"item_code": "s1_safety", "value": 2}).get_json()
        assert answered["safety_triggered"] is True
        assert answered["safety_response"] is not None

        result = api.post("/api/screening/stage1/complete",
                          headers={HEADER: token}).get_json()
        # Arithmetic alone would put a total of 2 in the green band; the
        # disclosure must override that.
        assert result["total_score"] == 2
        assert result["tier"] == "orange"
        assert result["by_safety_override"] is True

        with screening_app.app_context():
            from src.models import SafetyEvent, ScreeningFollowUp
            event = (SafetyEvent.query
                     .filter_by(trigger_source="stage1_safety_question")
                     .order_by(SafetyEvent.id.desc()).first())
            assert event is not None
            assert event.alert_status == "pending"   # no channel wired yet
            assert ScreeningFollowUp.query.filter_by(
                safety_event_id=event.id, status="new").count() == 1


class TestStage2:
    def test_requires_completed_stage1(self, api, screening_app):
        _publish_instruments(screening_app)
        token = _consented(api)
        r = api.get("/api/screening/stage2", headers={HEADER: token})
        assert r.status_code == 409
        assert r.get_json()["code"] == "stage1_required"

    def test_refused_when_not_indicated(self, api, screening_app):
        _publish_instruments(screening_app)
        token = _consented(api)
        result = _run_stage1(api, token,
                             [("s1_q1", 0), ("s1_q2", 1), ("s1_q3", 0), ("s1_safety", 0)])
        assert result["next"] == "end"
        r = api.get("/api/screening/stage2", headers={HEADER: token})
        assert r.status_code == 409
        assert r.get_json()["code"] == "stage2_not_indicated"

    def test_gate_holds_on_every_route(self, api, screening_app):
        """Not just the opener — /answer and /complete re-check too."""
        _publish_instruments(screening_app)
        token = _consented(api)
        for path in ("/api/screening/stage2/answer", "/api/screening/stage2/complete"):
            r = api.post(path, headers={HEADER: token},
                         json={"item_code": "epds_1", "value": 0})
            assert r.status_code == 409
            assert r.get_json()["code"] == "stage1_required"

    def test_epds_run_and_item_10_safety(self, api, screening_app):
        _publish_instruments(screening_app)
        token = _consented(api)
        stage1 = _run_stage1(api, token,
                             [("s1_q1", 2), ("s1_q2", 2), ("s1_q3", 1), ("s1_safety", 0)])
        assert stage1["next"] == "stage2"

        start = api.get("/api/screening/stage2", headers={HEADER: token}).get_json()
        assert start["completed"] is False
        assert len(start["content"]["items"]) == 10

        for n in range(1, 10):
            api.post("/api/screening/stage2/answer", headers={HEADER: token},
                     json={"item_code": f"epds_{n}", "value": 0})
        answered = api.post("/api/screening/stage2/answer", headers={HEADER: token},
                            json={"item_code": "epds_10", "value": 2}).get_json()
        assert answered["safety_triggered"] is True

        result = api.post("/api/screening/stage2/complete",
                          headers={HEADER: token}).get_json()
        assert result["stage"] == 2
        assert result["epds_status"] is not None
        assert result["tier"] is None          # stage-2 result, not a stage-1 tier
        assert result["by_safety_override"] is True

        with screening_app.app_context():
            from src.models import SafetyEvent, ScreeningSession
            assert SafetyEvent.query.filter_by(trigger_source="epds_item_10").count() >= 1
            session = (ScreeningSession.query.filter_by(stage=2, status="completed")
                       .order_by(ScreeningSession.id.desc()).first())
            assert session.epds_total_score is not None
            assert session.stage1_total_score is None   # stage columns stay separate
            assert session.preceded_by_session_id is not None

    def test_completed_stage2_returns_result_not_a_rerun(self, api, screening_app):
        _publish_instruments(screening_app)
        token = _consented(api)
        _run_stage1(api, token,
                    [("s1_q1", 2), ("s1_q2", 2), ("s1_q3", 1), ("s1_safety", 0)])
        api.get("/api/screening/stage2", headers={HEADER: token})
        for n in range(1, 11):
            api.post("/api/screening/stage2/answer", headers={HEADER: token},
                     json={"item_code": f"epds_{n}", "value": 0})
        api.post("/api/screening/stage2/complete", headers={HEADER: token})

        again = api.get("/api/screening/stage2", headers={HEADER: token}).get_json()
        assert again["completed"] is True
        assert again["result"]["total_score"] == 0


class TestLegacyMLRemoved:
    """
    Regression guard for decisions #1 and #8.

    The unvalidated ML well-being index once produced risk labels it described
    as "informed by EPDS". With a real screening engine in place, any return of
    that code would give the codebase two EPDS-flavoured scoring paths, one of
    them ungoverned. These tests fail if it comes back.
    """

    LEGACY_PATHS = [
        "src/services/ml_service.py",
        "src/routes/ml_metrics.py",
        "src/ml",
        "frontend/src/pages/DashboardPage.tsx",
    ]

    def test_legacy_modules_absent(self):
        present = [p for p in self.LEGACY_PATHS if (REPO_ROOT / p).exists()]
        assert not present, f"legacy ML artefacts are back: {present}"

    def test_legacy_endpoints_gone(self, api):
        for path in ("/api/ml/health", "/api/ml/metrics"):
            assert api.get(path).status_code == 404, path

    def test_no_legacy_symbols_in_source(self):
        """
        Tokenised, not grepped: only real NAME tokens count, so comments and
        docstrings explaining the removal do not trip the guard while actual
        code using the symbols does.
        """
        import io
        import tokenize

        banned = {"get_ml_service", "create_ml_service", "MLService",
                  "get_stress_label", "predicted_stress_index"}
        offenders = []
        for path in list(REPO_ROOT.glob("src/**/*.py")) +                     list(REPO_ROOT.glob("scripts/*.py")) + [REPO_ROOT / "app.py"]:
            source = path.read_text(encoding="utf-8")
            for tok in tokenize.generate_tokens(io.StringIO(source).readline):
                if tok.type == tokenize.NAME and tok.string in banned:
                    offenders.append(f"{path.name}:{tok.start[0]} {tok.string}")
        assert not offenders, offenders

    def test_only_one_epds_engine(self):
        """Every module that scores an EPDS must be the new engine."""
        scorers = []
        for path in REPO_ROOT.glob("src/**/*.py"):
            text = path.read_text(encoding="utf-8").lower()
            if "epds" in text and ("score" in text or "threshold" in text):
                scorers.append(path.relative_to(REPO_ROOT).as_posix())
        unexpected = [s for s in scorers if not (
            s.startswith("src/services/screening_") or s == "src/routes/screening.py"
            or s == "src/models.py")]
        assert not unexpected, f"unexpected EPDS scoring modules: {unexpected}"


class TestContentPublication:
    """Rule 4 in screening_content.sync_content: the file can publish, only up."""

    def _row(self, version):
        from src.models import ScreeningContentVersion
        return ScreeningContentVersion.query.filter_by(
            content_key="stage1_triage", version=version, language="en").one()

    def test_file_active_publishes_a_registered_draft(self, screening_app):
        """A database that outlives the deploy must still see a publication.

        The status on a new row only ever reaches a database being populated
        for the first time. Without this, editing the file and shipping it
        would do nothing at all, silently.
        """
        from src.services.screening_content import sync_content
        with screening_app.app_context():
            row = self._row("1.0.0")           # the file declares "active"
            before = (row.status, row.published_at)
            row.status, row.published_at = "draft", None
            _db.session.commit()
            try:
                sync_content()
                after = self._row("1.0.0")
                assert after.status == "active"
                assert after.published_at is not None
            finally:
                row = self._row("1.0.0")
                row.status, row.published_at = before
                _db.session.commit()

    def test_sync_never_unpublishes(self, screening_app):
        """A redeploy must not take back something a human published."""
        from src.services.screening_content import sync_content
        with screening_app.app_context():
            row = self._row("0.1.0-placeholder")   # the file declares "draft"
            before = row.status
            row.status = "active"
            _db.session.commit()
            try:
                sync_content()
                assert self._row("0.1.0-placeholder").status == "active"
            finally:
                row = self._row("0.1.0-placeholder")
                row.status = before
                _db.session.commit()

    def test_cannot_publish_a_bundle_written_in_another_language(self, screening_app):
        """A bundle may not be published in a language it is not written in.

        The condition is built here rather than leaning on whichever bundle
        happens to be untranslated today: which files are translated changes,
        the rule must not. Note the guard only proves the script is right, not
        that the wording is the validated instrument — a hand translation of
        the PHQ passes this and is still not the PHQ.
        """
        import json
        from src.models import ScreeningContentVersion
        from src.services.screening_content import (
            ContentError, bundle_of, canonical_json, publish, script_violations)

        with screening_app.app_context():
            row = self._row_any("stage1_triage", "1.0.0", "am")
            before = (row.payload, row.status)
            english = bundle_of(row)
            english["items"] = [
                dict(item, text="Feeling nervous, anxious or on edge")
                for item in english["items"]
            ]
            row.payload = canonical_json(english)
            row.status = "draft"
            _db.session.commit()
            try:
                with pytest.raises(ContentError) as exc:
                    publish("stage1_triage", "1.0.0", "am")
                assert "Ethiopic" in str(exc.value)
                assert self._row_any("stage1_triage", "1.0.0", "am").status == "draft"
            finally:
                row = self._row_any("stage1_triage", "1.0.0", "am")
                row.payload, row.status = before
                _db.session.commit()

            # An English bundle is unconstrained; a real Amharic one passes.
            assert script_violations(
                {"language": "en", "items": [{"code": "x", "text": "Feeling nervous"}]}
            ) == []
            consent = ScreeningContentVersion.query.filter_by(
                content_key="consent", language="am").first()
            assert script_violations(bundle_of(consent)) == []


    def _row_any(self, key, version, language):
        from src.models import ScreeningContentVersion
        return ScreeningContentVersion.query.filter_by(
            content_key=key, version=version, language=language).one()

    def test_band_identifiers_are_not_translatable(self):
        """Band labels and `next` are identifiers, not words anyone reads.

        Translating them yields a bundle that validates, serves, and then
        fails at the end of a real questionnaire — stage1_tier is constrained
        to green/amber/orange, so the 500 lands after she has answered
        everything. This moves that failure to boot.
        """
        import copy
        import json as _json
        from src.services.screening_content import ContentError, validate_bundle

        path = (REPO_ROOT / "src" / "content" / "stage1_triage"
                / "stage1_triage_en_1.0.0.json")
        base = _json.loads(path.read_text(encoding="utf-8"))
        validate_bundle(base, source="baseline")     # unchanged, still valid

        translated_tier = copy.deepcopy(base)
        translated_tier["scoring"]["tiers"][0]["tier"] = "አረንጣዴ"
        with pytest.raises(ContentError, match="results"):
            validate_bundle(translated_tier, source="translated_tier")

        translated_next = copy.deepcopy(base)
        translated_next["scoring"]["tiers"][1]["next"] = "ደረጃ 2"
        with pytest.raises(ContentError, match="next"):
            validate_bundle(translated_next, source="translated_next")


class TestSafetyAlert:
    """The channel that tells a clinician a disclosure happened."""

    def _disclose(self, api, screening_app):
        """Runs a Stage 1 disclosure and returns the SafetyEvent."""
        _publish_instruments(screening_app)
        token = _consented(api)
        api.get("/api/screening/stage1", headers={HEADER: token})
        api.post("/api/screening/stage1/answer", headers={HEADER: token},
                 json={"item_code": "s1_safety", "value": 3})
        with screening_app.app_context():
            from src.models import SafetyEvent
            return SafetyEvent.query.order_by(SafetyEvent.id.desc()).first()

    def test_no_channel_configured_records_nothing_and_says_so(self, api, screening_app):
        """Without a channel, 'pending' is the honest status: nobody was told."""
        event = self._disclose(api, screening_app)
        assert event is not None
        with screening_app.app_context():
            from src.models import SafetyAlertAttempt
            assert event.alert_status == "pending"
            assert SafetyAlertAttempt.query.filter_by(
                safety_event_id=event.id).count() == 0

    def test_successful_send_is_logged_and_advances_status(self, api, screening_app, monkeypatch):
        from src.models import SafetyAlertAttempt, SafetyEvent
        from src.services import safety_alert

        event = self._disclose(api, screening_app)
        with screening_app.app_context():
            monkeypatch.setitem(screening_app.config, "TELEGRAM_BOT_TOKEN", "t")
            monkeypatch.setitem(screening_app.config, "TELEGRAM_ALERT_CHAT_ID", "c")
            monkeypatch.setattr(safety_alert, "_send_telegram", lambda text: None)

            row = _db.session.get(SafetyEvent, event.id)
            assert safety_alert.dispatch_safety_alert(row) == "sent"
            _db.session.commit()

            attempts = SafetyAlertAttempt.query.filter_by(safety_event_id=row.id).all()
            assert [a.outcome for a in attempts] == ["sent"]
            assert attempts[0].channel == "telegram"
            assert row.alert_status == "sent"

    def test_failure_is_recorded_not_swallowed(self, api, screening_app, monkeypatch):
        """A channel that fails must look different from one that works."""
        from src.models import SafetyAlertAttempt, SafetyEvent
        from src.services import safety_alert

        event = self._disclose(api, screening_app)
        with screening_app.app_context():
            monkeypatch.setitem(screening_app.config, "TELEGRAM_BOT_TOKEN", "t")
            monkeypatch.setitem(screening_app.config, "TELEGRAM_ALERT_CHAT_ID", "c")

            def boom(text):
                raise RuntimeError("Telegram refused the message: 'chat not found'")
            monkeypatch.setattr(safety_alert, "_send_telegram", boom)

            row = _db.session.get(SafetyEvent, event.id)
            assert safety_alert.dispatch_safety_alert(row) == "failed"
            _db.session.commit()

            attempt = SafetyAlertAttempt.query.filter_by(
                safety_event_id=row.id).order_by(SafetyAlertAttempt.id.desc()).first()
            assert attempt.outcome == "failed"
            assert "chat not found" in attempt.error_detail
            assert row.alert_status == "failed"

    def test_message_carries_no_answers(self, api, screening_app):
        """It lands on a lock screen. Her words must not be in it."""
        from src.models import SafetyEvent
        from src.services.safety_alert import build_message

        event = self._disclose(api, screening_app)
        with screening_app.app_context():
            row = _db.session.get(SafetyEvent, event.id)
            text = build_message(row)
            assert row.event_uid in text
            for leak in (row.item_response_label, str(row.item_response_value)):
                if leak:
                    assert leak not in text, f"alert leaked {leak!r}"

    def test_dispatch_never_raises(self, api, screening_app, monkeypatch):
        """A notification problem must not cost her the session."""
        from src.models import SafetyEvent
        from src.services import safety_alert

        event = self._disclose(api, screening_app)
        with screening_app.app_context():
            monkeypatch.setitem(screening_app.config, "TELEGRAM_BOT_TOKEN", "t")
            monkeypatch.setitem(screening_app.config, "TELEGRAM_ALERT_CHAT_ID", "c")

            # Not one of the errors dispatch_safety_alert foresees — that is
            # the point. A BaseException such as KeyboardInterrupt is left to
            # propagate deliberately; this guard is for ordinary bugs.
            def explode(text):
                raise AttributeError("something nobody foresaw")
            monkeypatch.setattr(safety_alert, "_send_telegram", explode)

            row = _db.session.get(SafetyEvent, event.id)
            assert safety_alert.dispatch_safely(row) is None
