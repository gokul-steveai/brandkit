-- Add RLS policy for rate_limits table (managed by service role only)
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);