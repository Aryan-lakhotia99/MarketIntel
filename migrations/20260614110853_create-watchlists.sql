-- Create watchlists table referencing auth.users(id)
CREATE TABLE IF NOT EXISTS public.watchlists (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create watchlist_items table referencing public.watchlists(id)
CREATE TABLE IF NOT EXISTS public.watchlist_items (
    id BIGSERIAL PRIMARY KEY,
    watchlist_id BIGINT NOT NULL REFERENCES public.watchlists(id) ON DELETE CASCADE,
    stock_ticker TEXT NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_watchlist_stock UNIQUE (watchlist_id, stock_ticker)
);

-- Enable Row-Level Security
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON public.watchlists TO authenticated;
GRANT ALL ON public.watchlist_items TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.watchlists_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.watchlist_items_id_seq TO authenticated;

-- Policies for watchlists
CREATE POLICY watchlists_all_policy ON public.watchlists
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policies for watchlist_items (must join to watchlists to check user ownership)
CREATE POLICY watchlist_items_all_policy ON public.watchlist_items
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.watchlists w
            WHERE w.id = watchlist_items.watchlist_id AND w.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.watchlists w
            WHERE w.id = watchlist_items.watchlist_id AND w.user_id = auth.uid()
        )
    );
