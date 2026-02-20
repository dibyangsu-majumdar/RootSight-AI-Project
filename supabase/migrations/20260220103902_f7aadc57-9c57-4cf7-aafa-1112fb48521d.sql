
-- Create log_analyses table
CREATE TABLE public.log_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT,
  raw_log TEXT NOT NULL,
  detected_error_type TEXT,
  root_cause_summary TEXT,
  suggested_fix TEXT,
  business_impact TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.log_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own analyses"
  ON public.log_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses"
  ON public.log_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
  ON public.log_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster user-specific queries
CREATE INDEX idx_log_analyses_user_id ON public.log_analyses(user_id);
CREATE INDEX idx_log_analyses_created_at ON public.log_analyses(created_at DESC);
