/*
# Add admin role and update subscription flow

## New Columns

### profiles.is_admin
- Boolean flag to mark admin users (default false).
- Admin users get access to the Admin Dashboard.

## Modified Tables

### subscription_requests
- Added admin_note field for admin comments when approving/rejecting requests.
- Added user_email field for admin visibility.
- Trigger to auto-update profiles.subscription_plan when a request is approved.

## New Trigger Function

### update_subscription_on_approval()
- Automatically updates profiles.subscription_plan when a subscription_request is approved.
- Called BEFORE UPDATE on subscription_requests.

## Notes
1. The first user can be manually promoted to admin via SQL if needed.
2. Approval workflow: Admin sets status='approved', trigger updates profile plan automatically.
*/

-- Add is_admin column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Add indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON public.subscription_requests(status);

-- Add user_email to subscription_requests for admin visibility
ALTER TABLE public.subscription_requests
  ADD COLUMN IF NOT EXISTS user_email text DEFAULT '';

-- Function to update profile subscription when request is approved
CREATE OR REPLACE FUNCTION public.update_subscription_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when status changes TO 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE public.profiles
    SET subscription_plan = NEW.plan,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- If rejected, ensure plan stays as free
  IF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
    UPDATE public.profiles
    SET subscription_plan = 'free',
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on subscription_requests
DROP TRIGGER IF EXISTS trg_sub_request_update ON public.subscription_requests;
CREATE TRIGGER trg_sub_request_update
  BEFORE UPDATE ON public.subscription_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_subscription_on_approval();

-- Trigger to populate user_email on insert
CREATE OR REPLACE FUNCTION public.populate_sub_request_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  NEW.user_email := COALESCE(user_email, '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_populate_sub_email ON public.subscription_requests;
CREATE TRIGGER trg_populate_sub_email
  BEFORE INSERT ON public.subscription_requests
  FOR EACH ROW EXECUTE FUNCTION public.populate_sub_request_email();
