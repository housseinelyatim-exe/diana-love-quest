-- Create cache table for AI responses
CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_hash TEXT NOT NULL UNIQUE,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage cache
CREATE POLICY "Service role can manage cache"
ON public.ai_response_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_cache_question_hash ON public.ai_response_cache(question_hash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_last_used ON public.ai_response_cache(last_used_at);

-- Function to clean old cache entries (keep last 30 days, max 10000 entries)
CREATE OR REPLACE FUNCTION public.clean_ai_cache()
RETURNS void AS $$
BEGIN
  -- Delete entries older than 30 days
  DELETE FROM public.ai_response_cache 
  WHERE last_used_at < now() - interval '30 days';
  
  -- Keep only top 10000 most recent entries
  DELETE FROM public.ai_response_cache
  WHERE id NOT IN (
    SELECT id FROM public.ai_response_cache
    ORDER BY last_used_at DESC
    LIMIT 10000
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;