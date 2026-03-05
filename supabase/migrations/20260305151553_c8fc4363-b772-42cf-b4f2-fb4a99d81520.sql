
-- Create feedback table
CREATE TABLE public.incident_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  section_name TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback" ON public.incident_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback" ON public.incident_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feedback" ON public.incident_feedback FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add AI summary column to incidents
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS ai_summary TEXT;
