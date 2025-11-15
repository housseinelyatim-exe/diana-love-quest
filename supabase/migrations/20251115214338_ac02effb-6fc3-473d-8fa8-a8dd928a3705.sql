-- Add question progress tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_question_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS asked_questions JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_question_index ON public.profiles(current_question_index);