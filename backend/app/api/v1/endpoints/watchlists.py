import sqlite3
from fastapi import APIRouter, HTTPException, Depends, status
from app.core.db import get_db_connection
from app.api.v1.endpoints.auth import get_current_user
from app.schemas.watchlist_schemas import WatchlistCreate, WatchlistResponse, WatchlistStockRequest

router = APIRouter(prefix="/watchlists", tags=["watchlists"])

@router.post("", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
def create_watchlist(request: WatchlistCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    google_id = current_user.get("google_id")
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Resolve DB user_id using u.google_id if Google User, or u.id if Local
        if google_id:
            cursor.execute("SELECT id FROM users WHERE google_id = ?", (google_id,))
            row = cursor.fetchone()
            resolved_user_id = row["id"] if row else user_id
        else:
            resolved_user_id = user_id

        # Create watchlist
        cursor.execute(
            "INSERT INTO watchlists (user_id, name) VALUES (?, ?)",
            (resolved_user_id, request.name)
        )
        watchlist_id = cursor.lastrowid
        conn.commit()
        
        # Retrieve created watchlist
        cursor.execute("SELECT id, name, created_at FROM watchlists WHERE id = ?", (watchlist_id,))
        row = cursor.fetchone()
        
        return WatchlistResponse(
            id=row["id"],
            name=row["name"],
            items=[],
            createdAt=row["created_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create watchlist: {str(e)}"
        )
    finally:
        conn.close()

@router.get("", response_model=list[WatchlistResponse])
def get_watchlists(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    google_id = current_user.get("google_id")
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Get all watchlists of the user matching google_id if Google User, else id
        if google_id:
            cursor.execute("""
                SELECT w.id, w.name, w.created_at 
                FROM watchlists w
                JOIN users u ON w.user_id = u.id
                WHERE u.google_id = ?
                ORDER BY w.id ASC
            """, (google_id,))
        else:
            cursor.execute("""
                SELECT w.id, w.name, w.created_at 
                FROM watchlists w
                JOIN users u ON w.user_id = u.id
                WHERE u.id = ? AND u.google_id IS NULL
                ORDER BY w.id ASC
            """, (user_id,))
            
        watchlist_rows = cursor.fetchall()
        
        watchlists = []
        for wl in watchlist_rows:
            wl_id = wl["id"]
            # Get all tickers in this watchlist
            cursor.execute("SELECT stock_ticker FROM watchlist_items WHERE watchlist_id = ? ORDER BY id ASC", (wl_id,))
            items = [item["stock_ticker"] for item in cursor.fetchall()]
            
            watchlists.append(WatchlistResponse(
                id=wl_id,
                name=wl["name"],
                items=items,
                createdAt=wl["created_at"]
            ))
            
        return watchlists
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve watchlists: {str(e)}"
        )
    finally:
        conn.close()

@router.post("/add")
def add_to_watchlist(request: WatchlistStockRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    google_id = current_user.get("google_id")
    symbol = request.symbol.strip().upper()
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Verify ownership of the watchlist by checking user's google_id or database id
        if google_id:
            cursor.execute("""
                SELECT w.id FROM watchlists w
                JOIN users u ON w.user_id = u.id
                WHERE w.id = ? AND u.google_id = ?
            """, (request.watchlist_id, google_id))
        else:
            cursor.execute("""
                SELECT w.id FROM watchlists w
                JOIN users u ON w.user_id = u.id
                WHERE w.id = ? AND u.id = ? AND u.google_id IS NULL
            """, (request.watchlist_id, user_id))
            
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Watchlist not found or access denied"
            )
            
        # Add item to watchlist (ignore if already added due to UNIQUE constraint)
        try:
            cursor.execute(
                "INSERT INTO watchlist_items (watchlist_id, stock_ticker) VALUES (?, ?)",
                (request.watchlist_id, symbol)
            )
            conn.commit()
        except sqlite3.IntegrityError:
            # Already exists, just return success
            pass
            
        return {"status": "success", "message": f"Added {symbol} to watchlist."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add stock: {str(e)}"
        )
    finally:
        conn.close()

@router.delete("/remove")
def remove_from_watchlist(request: WatchlistStockRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    google_id = current_user.get("google_id")
    symbol = request.symbol.strip().upper()
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Verify ownership of the watchlist by checking user's google_id or database id
        if google_id:
            cursor.execute("""
                SELECT w.id FROM watchlists w
                JOIN users u ON w.user_id = u.id
                WHERE w.id = ? AND u.google_id = ?
            """, (request.watchlist_id, google_id))
        else:
            cursor.execute("""
                SELECT w.id FROM watchlists w
                JOIN users u ON w.user_id = u.id
                WHERE w.id = ? AND u.id = ? AND u.google_id IS NULL
            """, (request.watchlist_id, user_id))
            
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Watchlist not found or access denied"
            )
            
        # Delete item
        cursor.execute(
            "DELETE FROM watchlist_items WHERE watchlist_id = ? AND stock_ticker = ?",
            (request.watchlist_id, symbol)
        )
        conn.commit()
        
        return {"status": "success", "message": f"Removed {symbol} from watchlist."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove stock: {str(e)}"
        )
    finally:
        conn.close()


