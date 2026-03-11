-- Create user_communication table for support tickets and feedback
CREATE TABLE public.user_communication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_kit_id UUID REFERENCES public.brand_kits(id) ON DELETE SET NULL,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('Support Ticket', 'Feedback')),
  support_type TEXT, -- Only for Support Tickets: Bug Report, Feature Request, etc.
  subject TEXT NOT NULL,
  details TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_communication ENABLE ROW LEVEL SECURITY;

-- Users can create their own communications
CREATE POLICY "Users can create communications"
  ON public.user_communication FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own communications
CREATE POLICY "Users can view own communications"
  ON public.user_communication FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all communications
CREATE POLICY "Admins can view all communications"
  ON public.user_communication FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can update all communications
CREATE POLICY "Admins can update all communications"
  ON public.user_communication FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_user_communication_updated_at
  BEFORE UPDATE ON public.user_communication
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();