import os
import sys

# Ensure project root is available on sys.path in Vercel serverless environment
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.main import app

# Vercel entrypoint
handler = app
