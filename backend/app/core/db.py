import sqlite3
from pathlib import Path

# Path to SQLite users database
DB_PATH = Path(__file__).resolve().parents[2] / "data" / "users.db"

def get_db_connection() -> sqlite3.Connection:
    """Return a database connection. Creates the database file if it does not exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db() -> None:
    """Initialize database tables."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Schema migration check: check if auth_provider and google_id are present in users table
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # If the table exists but lacks our new columns, drop all tables to execute a clean migration
        if columns and ("auth_provider" not in columns or "google_id" not in columns):
            print("[DB MIGRATION] Outdated schema detected. Dropping old tables...")
            cursor.execute("DROP TABLE IF EXISTS user_resets")
            cursor.execute("DROP TABLE IF EXISTS users")
            cursor.execute("DROP TABLE IF EXISTS watchlists")
            cursor.execute("DROP TABLE IF EXISTS watchlist_items")
            
        # Create users table (updated schema)
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
        
        # Indexes
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id)")
        
        conn.commit()
    except Exception as e:
        print(f"Error initializing SQLite database: {e}")
    finally:
        conn.close()
