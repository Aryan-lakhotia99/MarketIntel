import os
import sqlite3
from pathlib import Path
from urllib.parse import urlparse

# Path to SQLite users database (used in local fallback mode)
DB_PATH = Path(__file__).resolve().parents[2] / "data" / "users.db"

# Global flag to check database type
database_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
IS_POSTGRES = bool(database_url and (database_url.startswith("postgres://") or database_url.startswith("postgresql://")))

class PgRow:
    """A row wrapper for PostgreSQL query results that supports both index-based and key-based access, matching sqlite3.Row."""
    def __init__(self, data_dict, data_tuple):
        self._dict = data_dict
        self._tuple = data_tuple

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._tuple[key]
        try:
            return self._dict[key]
        except KeyError:
            raise KeyError(key)

    def keys(self):
        return self._dict.keys()

    def get(self, key, default=None):
        return self._dict.get(key, default)

    def __iter__(self):
        return iter(self._tuple)

    def __len__(self):
        return len(self._tuple)


class PgCursorWrapper:
    """A cursor wrapper that translates SQLite SQL syntax and parameter placeholders to PostgreSQL format on the fly."""
    def __init__(self, pg_cursor):
        self.cursor = pg_cursor
        self.lastrowid = None

    def execute(self, sql, params=None):
        # 1. Translate sqlite placeholder '?' to postgres '%s'
        postgres_sql = sql.replace("?", "%s")
        
        # 2. Translate sqlite table creation keywords to postgres
        postgres_sql = postgres_sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
        postgres_sql = postgres_sql.replace("DATETIME", "TIMESTAMP")
        
        # 3. Intercept INSERT queries to retrieve the last row ID
        is_insert = postgres_sql.strip().upper().startswith("INSERT")
        if is_insert and "RETURNING" not in postgres_sql.upper():
            postgres_sql += " RETURNING id"

        self.cursor.execute(postgres_sql, params or ())
        
        if is_insert and "RETURNING id" in postgres_sql:
            try:
                row = self.cursor.fetchone()
                if row:
                    self.lastrowid = row[0]
            except Exception:
                pass

    def fetchone(self):
        row = self.cursor.fetchone()
        if row is None:
            return None
        colnames = [desc[0] for desc in self.cursor.description]
        row_dict = dict(zip(colnames, row))
        return PgRow(row_dict, row)

    def fetchall(self):
        rows = self.cursor.fetchall()
        if not rows:
            return []
        colnames = [desc[0] for desc in self.cursor.description]
        results = []
        for r in rows:
            row_dict = dict(zip(colnames, r))
            results.append(PgRow(row_dict, r))
        return results

    def close(self):
        self.cursor.close()


class PgConnectionWrapper:
    """A connection wrapper that exposes our PgCursorWrapper."""
    def __init__(self, pg_conn):
        self.conn = pg_conn

    def cursor(self):
        return PgCursorWrapper(self.conn.cursor())

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()


def get_db_connection():
    """Return a database connection. Returns a wrapped PostgreSQL connection if DATABASE_URL is configured, else falls back to SQLite."""
    if IS_POSTGRES:
        import pg8000.dbapi
        url = urlparse(database_url)
        # Enable SSL by default since hosted PostgreSQL instances (Neon, Supabase, Render) enforce it.
        conn = pg8000.dbapi.connect(
            user=url.username,
            password=url.password,
            host=url.hostname,
            port=url.port or 5432,
            database=url.path[1:],
            ssl_context=True
        )
        return PgConnectionWrapper(conn)
    else:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        return conn


def init_db() -> None:
    """Initialize database tables."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Schema migration check: only applicable for local SQLite
        if not IS_POSTGRES:
            cursor.execute("PRAGMA table_info(users)")
            columns = [col[1] for col in cursor.fetchall()]
            
            # If the table exists but lacks our new columns, drop all tables to execute a clean migration
            if columns and ("auth_provider" not in columns or "google_id" not in columns):
                print("[DB MIGRATION] Outdated schema detected. Dropping old tables...")
                cursor.execute("DROP TABLE IF EXISTS user_resets")
                cursor.execute("DROP TABLE IF EXISTS users")
                cursor.execute("DROP TABLE IF EXISTS watchlists")
                cursor.execute("DROP TABLE IF EXISTS watchlist_items")
            
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                google_id TEXT UNIQUE, -- Stores real Google sub ID
                hashed_password TEXT, -- Nullable for OAuth users
                name TEXT,
                profile_pic TEXT,
                auth_provider TEXT DEFAULT 'local',
                premium_tier_status TEXT DEFAULT 'free',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create user_resets table for password recovery
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_resets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                token TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                FOREIGN KEY (email) REFERENCES users (email) ON DELETE CASCADE
            )
        """)
        
        # Create watchlists table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS watchlists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        
        # Create watchlist_items table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS watchlist_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                watchlist_id INTEGER NOT NULL,
                stock_ticker TEXT NOT NULL,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (watchlist_id) REFERENCES watchlists (id) ON DELETE CASCADE,
                UNIQUE(watchlist_id, stock_ticker)
            )
        """)
        
        # Indexes (Only create index statements if not SQLite, or use standard syntax)
        # SQLite needs IF NOT EXISTS which is fully compatible
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id)")
        
        conn.commit()
    except Exception as e:
        print(f"Error initializing database: {e}")
    finally:
        conn.close()
