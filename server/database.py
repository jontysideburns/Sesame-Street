from __future__ import annotations

from psycopg import connect
from psycopg.rows import dict_row

from server.config import DATABASE_URL


def get_connection():
    return connect(DATABASE_URL, row_factory=dict_row)
