#!/usr/bin/env bash
# exit on error
set -o errexit

# 1. Build the React frontend
cd frontend
npm install
npm run build
cd ..

# 2. Install backend dependencies
pip install -r requirements.txt
