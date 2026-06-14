/**
 * GET  /api/watchlists  — fetch all watchlists + items for the current user
 * POST /api/watchlists  — create a new watchlist
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";

// ─── GET /api/watchlists ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { insforgeUserId, db } = await requireAuth(req);

    // Fetch all watchlists belonging to the authenticated user
    const { data: watchlistRows, error: wlErr } = await db.database
      .from("watchlists")
      .select("id, name, created_at")
      .eq("user_id", insforgeUserId)
      .order("id", { ascending: true });

    if (wlErr) throw new Error(wlErr.message);

    // Fetch all items for those watchlists in a single query
    const watchlistIds: number[] = (watchlistRows ?? []).map((w: any) => w.id);

    let itemRows: any[] = [];
    if (watchlistIds.length > 0) {
      const { data: items, error: itemErr } = await db.database
        .from("watchlist_items")
        .select("watchlist_id, stock_ticker")
        .in("watchlist_id", watchlistIds)
        .order("id", { ascending: true });

      if (itemErr) throw new Error(itemErr.message);
      itemRows = items ?? [];
    }

    // Group items by watchlist
    const itemsByWatchlist: Record<number, string[]> = {};
    for (const item of itemRows) {
      if (!itemsByWatchlist[item.watchlist_id]) {
        itemsByWatchlist[item.watchlist_id] = [];
      }
      itemsByWatchlist[item.watchlist_id].push(item.stock_ticker);
    }

    const watchlists = (watchlistRows ?? []).map((wl: any) => ({
      id: wl.id,
      name: wl.name,
      createdAt: wl.created_at,
      items: itemsByWatchlist[wl.id] ?? [],
    }));

    return NextResponse.json(watchlists);
  } catch (err: any) {
    const isAuth = err.message?.includes("authenticated") || err.message?.includes("session");
    return NextResponse.json(
      { detail: err.message },
      { status: isAuth ? 401 : 500 }
    );
  }
}

// ─── POST /api/watchlists ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { insforgeUserId, db } = await requireAuth(req);

    const body = await req.json();
    const name = (body?.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ detail: "Watchlist name is required" }, { status: 400 });
    }

    const { data, error } = await db.database
      .from("watchlists")
      .insert([{ user_id: insforgeUserId, name }])
      .select("id, name, created_at")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(
      { id: data.id, name: data.name, createdAt: data.created_at, items: [] },
      { status: 201 }
    );
  } catch (err: any) {
    const isAuth = err.message?.includes("authenticated") || err.message?.includes("session");
    return NextResponse.json(
      { detail: err.message },
      { status: isAuth ? 401 : 500 }
    );
  }
}
