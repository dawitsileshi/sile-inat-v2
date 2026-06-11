#!/usr/bin/env bash
# exit on error
set -o errexit

# 1. Install backend dependencies (must come first for ML training)
pip install -r requirements.txt

# 2. Train the ML model (artifacts not committed to git)
python src/ml/synthesize_data.py
python src/ml/train.py

# 3. Build the React frontend (so Flask can serve it from frontend/dist)
cd frontend
npm install
npm run build
cd ..
