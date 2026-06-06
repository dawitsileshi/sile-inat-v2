import os
import sys
from pathlib import Path

# Add the project root to the Python path so imports work correctly
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app import create_app

app = create_app()
