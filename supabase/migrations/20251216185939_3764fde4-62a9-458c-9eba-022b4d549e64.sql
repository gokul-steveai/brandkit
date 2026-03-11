-- Enable realtime for profiles table so avatar/name changes update immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;