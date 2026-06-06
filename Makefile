# ═══════════════════════════════════════════════════════════════════════════════
#  Maternal Wellness API — Makefile
#  One-command developer workflow
# ═══════════════════════════════════════════════════════════════════════════════

VENV        := venv
PYTHON      := $(VENV)/bin/python
PIP         := $(VENV)/bin/pip
PYTEST      := $(VENV)/bin/pytest
FLASK       := $(VENV)/bin/flask

.DEFAULT_GOAL := help

# ─── Help ─────────────────────────────────────────────────────────────────────
.PHONY: help
help:
	@echo ""
	@echo "  Maternal Wellness API — Available Commands"
	@echo "  ──────────────────────────────────────────"
	@echo "  make install      Create venv & install all dependencies"
	@echo "  make train        Synthesise data → train ML model"
	@echo "  make run          Start Flask dev server (port 5050)"
	@echo "  make seed         Seed DB with 60 days of test data"
	@echo "  make test         Run pytest test suite"
	@echo "  make clean        Remove venv, DB, and ML artifacts"
	@echo "  make all          install + train + run (full bootstrap)"
	@echo ""

# ─── Setup ────────────────────────────────────────────────────────────────────
.PHONY: install
install:
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	cp -n .env.example .env || true
	@echo "✅ Dependencies installed. Edit .env as needed."

# ─── ML Pipeline ──────────────────────────────────────────────────────────────
.PHONY: synthesise
synthesise:
	$(PYTHON) src/ml/synthesize_data.py
	@echo "✅ Synthetic dataset generated."

.PHONY: train
train: synthesise
	$(PYTHON) src/ml/train.py
	@echo "✅ Model trained and saved to src/ml/artifacts/"

# ─── Server ───────────────────────────────────────────────────────────────────
.PHONY: run
run:
	FLASK_APP=app.py FLASK_ENV=development $(PYTHON) app.py

# ─── Seed ─────────────────────────────────────────────────────────────────────
.PHONY: seed
seed:
	$(PYTHON) scripts/seed_db.py

# ─── Tests ────────────────────────────────────────────────────────────────────
.PHONY: test
test:
	$(PYTEST) tests/ -v --tb=short

# ─── Full Bootstrap ───────────────────────────────────────────────────────────
.PHONY: all
all: install train run

# ─── Clean ────────────────────────────────────────────────────────────────────
.PHONY: clean
clean:
	rm -rf $(VENV) instance/ src/ml/artifacts/ src/ml/data/*.csv __pycache__
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Cleaned."
