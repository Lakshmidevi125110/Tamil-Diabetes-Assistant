import os

# Gunicorn production configuration for Render Free Tier deployment
# Reads PORT from environment variable (Render sets this dynamically, defaults to 5000)
port = os.getenv("PORT", "5000")
bind = f"0.0.0.0:{port}"

# Worker configuration optimized for Render free tier (512 MB RAM)
# 2 workers with 4 threads each handles concurrent voice/chat requests safely
workers = int(os.getenv("WEB_CONCURRENCY", "2"))
threads = int(os.getenv("PYTHON_THREADS", "4"))
worker_class = "gthread"
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))
keepalive = 5

# Logging to standard output/error for Render log stream
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
