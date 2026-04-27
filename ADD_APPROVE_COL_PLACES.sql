ALTER TABLE public.places ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
UPDATE public.places SET is_approved = true;
ALTER TABLE public.places ALTER COLUMN is_approved SET DEFAULT false;
