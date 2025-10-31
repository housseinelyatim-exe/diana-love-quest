-- Change is_profile_complete from boolean to integer to store percentage
ALTER TABLE profiles 
  ALTER COLUMN is_profile_complete DROP DEFAULT;

ALTER TABLE profiles 
  ALTER COLUMN is_profile_complete TYPE integer USING (CASE WHEN is_profile_complete THEN 100 ELSE 0 END);

ALTER TABLE profiles 
  ALTER COLUMN is_profile_complete SET DEFAULT 0;