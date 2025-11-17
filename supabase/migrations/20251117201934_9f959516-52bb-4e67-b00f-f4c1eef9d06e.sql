-- Add column to store actual user responses for each question
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS question_responses jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.question_responses IS 'Stores the actual user responses for each question field. Format: {"field_name": "user actual answer"}';