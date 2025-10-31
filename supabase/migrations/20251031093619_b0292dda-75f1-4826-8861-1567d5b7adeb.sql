-- Create enum types
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE education_level AS ENUM ('high_school', 'bachelor', 'master', 'phd', 'vocational', 'other');
CREATE TYPE employment_status AS ENUM ('employed', 'self_employed', 'student', 'unemployed', 'retired');
CREATE TYPE religion_type AS ENUM ('muslim', 'christian', 'jewish', 'buddhist', 'hindu', 'other', 'none');
CREATE TYPE practice_level AS ENUM ('very_religious', 'religious', 'moderate', 'not_religious');
CREATE TYPE yes_no_type AS ENUM ('yes', 'no', 'prefer_not_to_say');
CREATE TYPE frequency_type AS ENUM ('never', 'rarely', 'sometimes', 'often', 'very_often');
CREATE TYPE marital_status_type AS ENUM ('single', 'divorced', 'widowed');
CREATE TYPE language_type AS ENUM ('en', 'fr', 'ar', 'tn');
CREATE TYPE profile_status_type AS ENUM ('incomplete', 'active', 'paused', 'hidden');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  gender gender_type,
  is_profile_complete BOOLEAN DEFAULT FALSE,
  profile_status profile_status_type DEFAULT 'incomplete',
  
  -- Personal Information
  age INTEGER,
  height INTEGER, -- in cm
  health TEXT,
  disabilities_and_special_need yes_no_type,
  disabilities_and_special_need_type TEXT,
  where_he_live TEXT,
  where_want_to_live TEXT,
  where_was_born TEXT,
  relocation_same_country yes_no_type,
  relocation_across_countries yes_no_type,
  
  -- Education & Career
  education_lvl education_level,
  employment_status employment_status,
  job TEXT,
  
  -- Religious & Lifestyle
  religion religion_type,
  practice_lvl practice_level,
  smoking yes_no_type,
  drinking yes_no_type,
  
  -- Hobbies & Interests
  physical_activities TEXT[],
  cultural_activities TEXT[],
  creative_hobbies TEXT[],
  gaming_hobbies TEXT[],
  
  -- Habits
  sleep_habits TEXT,
  dietary_habits TEXT,
  work_life_balance TEXT,
  volunteer_community_work yes_no_type,
  
  -- Travel
  travel_frequency frequency_type,
  type_of_trips TEXT,
  travel_style TEXT,
  travel_planning TEXT,
  
  -- Pets
  have_pet yes_no_type,
  pet TEXT,
  
  -- Life Goals
  life_goal TEXT,
  marital_status marital_status_type,
  have_children yes_no_type,
  want_children yes_no_type,
  
  -- Partner Preferences
  age_range_preference INT4RANGE,
  height_preference TEXT,
  health_disability_preference TEXT,
  red_flags TEXT[],
  role_in_relationship TEXT,
  
  -- System fields
  language language_type DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_from_diana BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  compatibility_score INTEGER CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2)
);

-- Create quotes table
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  author TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Messages RLS Policies
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR is_from_diana = true);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Matches RLS Policies
CREATE POLICY "Users can view own matches"
  ON matches FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "System can create matches"
  ON matches FOR INSERT
  WITH CHECK (true); -- Will be controlled by edge function

-- Quotes RLS Policies
CREATE POLICY "Everyone can view quotes"
  ON quotes FOR SELECT
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, language)
  VALUES (NEW.id, 'en');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Insert some initial quotes
INSERT INTO quotes (content, author, category) VALUES
  ('Love is not about finding the perfect person, but learning to see an imperfect person perfectly.', 'Unknown', 'wisdom'),
  ('The best thing to hold onto in life is each other.', 'Audrey Hepburn', 'connection'),
  ('Love is composed of a single soul inhabiting two bodies.', 'Aristotle', 'philosophy'),
  ('To love and be loved is to feel the sun from both sides.', 'David Viscott', 'happiness'),
  ('The greatest happiness of life is the conviction that we are loved.', 'Victor Hugo', 'happiness');