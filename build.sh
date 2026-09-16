#!/usr/bin/env bash
# exit on error
set -o errexit

# 1. Install backend dependencies
pip install -r requirements.txt

# 2. Build the React frontend (so Flask can serve it from frontend/dist)
cd frontend
npm install
npm run build
cd ..
