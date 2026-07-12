-- Add full_name column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '';

-- Update existing profiles to set a default full_name if needed
UPDATE public.profiles 
SET full_name = COALESCE(full_name, '')
WHERE full_name IS NULL;