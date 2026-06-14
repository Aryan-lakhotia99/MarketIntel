/**
 * DELETE /api/watchlists/remove — remove a stock ticker from a watchlist
 *
 * Body: { watchlistId: number, symbol: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";

export async function DELETE(req: NextRequest) {
  try {
    const { insforgeUserId, db } = await requireAuth(req);

    const body = await req.json();
    const watchlistId = Number(body?.watchlistId);
    const symbol = (body?.symbol ?? "").trim().toUpperCase();

    if (!watchlistId || !symbol) {
      return NextResponse.json(
        { detail: "watchlistId and symbol are required" },
        { status: 400 }
      );
    }

    // Delete the ticker directly — RLS ensures users can only delete items from their own watchlists
    const { error: delErr } = await db.database
      .from("watchlist_items")
      .delete()
      .eq("watchlist_id", watchlistId)
      .eq("stock_ticker", symbol);

    if (delErr) throw new Error(delErr.message);

    return NextResponse.json({ status: "success", message: `Removed ${symbol} from watchlist.` });
  } catch (err: any) {
    const isAuth = err.message?.includes("authenticated") || err.message?.includes("session");
    return NextResponse.json(
      { detail: err.message },
      { status: isAuth ? 401 : 500 }
    );
  }
}
