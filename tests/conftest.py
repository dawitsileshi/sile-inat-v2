"""
tests/conftest.py — Pytest Configuration
=========================================
Shared fixtures available to all test modules without import.
"""

import pytest
from app import create_app
from config import TestingConfig
from src.extensions import db as _db


@pytest.fixture(scope="session")
def app():
    """Session-scoped Flask test application with in-memory SQLite."""
    application = create_app(TestingConfig)
    with application.app_context():
        _db.create_all()
        yield application
        _db.session.remove()
        _db.drop_all()


@pytest.fixture(scope="session")
def client(app):
    """Flask test client, shared across the entire test session."""
    return app.test_client()


@pytest.fixture(scope="session")
def runner(app):
    """Flask CLI test runner for testing Click commands."""
    return app.test_cli_runner()
