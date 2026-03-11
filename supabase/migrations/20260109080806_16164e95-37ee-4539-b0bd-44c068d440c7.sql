-- Set REPLICA IDENTITY to FULL so realtime sends complete row data on updates
ALTER TABLE public.user_subscriptions REPLICA IDENTITY FULL;