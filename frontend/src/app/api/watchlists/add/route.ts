/**
 * POST /api/watchlists/add — add a stock ticker to a watchlist
 *
 * Body: { watchlistId: number, symbol: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const { db } = await requireAuth(req);

    const body = await req.json();
    const watchlistId = Number(body?.watchlistId);
    const symbol = (body?.symbol ?? "").trim().toUpperCase();

    if (!watchlistId || !symbol) {
      return NextResponse.json(
        { detail: "watchlistId and symbol are required" },
        { status: 400 }
      );
    }

    // Insert the ticker directly — RLS handles ownership validation and UNIQUE constraint prevents duplicates
    const { error: insertErr } = await db.database
      .from("watchlist_items")
      .insert([{ watchlist_id: watchlistId, stock_ticker: symbol }]);

    if (insertErr) {
      // UNIQUE constraint unique_violation; treat as success (already exists)
      if (insertErr.message?.includes("unique")) {
        return NextResponse.json({ status: "success", message: `Added ${symbol} to watchlist.` });
      }
      // If it violates RLS, it means they don't own the watchlist or the watchlist doesn't exist
      if (insertErr.message?.includes("row-level security")) {
        return NextResponse.json(
          { detail: "Watchlist not found or access denied" },
          { status: 404 }
        );
      }
      throw new Error(insertErr.message);
    }

    return NextResponse.json({ status: "success", message: `Added ${symbol} to watchlist.` });
  } catch (err: any) {
    const isAuth = err.message?.includes("authenticated") || err.message?.includes("session");
    return NextResponse.json(
      { detail: err.message },
      { status: isAuth ? 401 : 500 }
    );
  }
}
