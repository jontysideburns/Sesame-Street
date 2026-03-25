from __future__ import annotations

import os


DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://sesame:sesame@localhost:5432/sesamestreet"
)
PORT = int(os.getenv("PORT", "4000"))
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:3000")
INTAKE_DIRECTORY = os.getenv("INTAKE_DIRECTORY", "/tmp/sesamestreet-intake")
INTAKE_POLL_SECONDS = int(os.getenv("INTAKE_POLL_SECONDS", "5"))
