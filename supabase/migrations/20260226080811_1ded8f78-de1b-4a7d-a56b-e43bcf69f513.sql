
-- Incidents table for memory & similarity matching
CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  environment TEXT,
  error_type TEXT,
  service_name TEXT,
  stack_trace_hash TEXT,
  root_cause_summary TEXT,
  confidence_score INTEGER DEFAULT 0,
  confidence_reasoning TEXT,
  recommended_fix_steps TEXT,
  long_term_prevention TEXT,
  impact_scope TEXT,
  affected_service TEXT,
  resolution_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Open',
  raw_log TEXT,
  file_name TEXT,
  log_analysis_id UUID REFERENCES public.log_analyses(id) ON DELETE SET NULL
);

-- Evaluation logs table
CREATE TABLE public.evaluation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  raw_log TEXT NOT NULL,
  expected_root_cause TEXT NOT NULL,
  predicted_root_cause TEXT,
  match_score NUMERIC DEFAULT 0,
  error_type TEXT,
  file_name TEXT,
  details JSONB DEFAULT '{}'::jsonb
);

-- RLS for incidents
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own incidents" ON public.incidents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own incidents" ON public.incidents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own incidents" ON public.incidents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own incidents" ON public.incidents
  FOR DELETE USING (auth.uid() = user_id);

-- RLS for evaluation_logs
ALTER TABLE public.evaluation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evaluations" ON public.evaluation_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evaluations" ON public.evaluation_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own evaluations" ON public.evaluation_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Index for similarity matching
CREATE INDEX idx_incidents_stack_trace_hash ON public.incidents(stack_trace_hash);
CREATE INDEX idx_incidents_error_type ON public.incidents(error_type);
CREATE INDEX idx_incidents_user_id ON public.incidents(user_id);
