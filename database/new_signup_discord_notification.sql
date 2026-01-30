-- Discord notification trigger for new user signups
-- This uses the pg_net extension to make HTTP requests to our webhook endpoint
--
-- Prerequisites:
-- 1. Enable pg_net extension in Supabase Dashboard (Database > Extensions)
-- 2. Set SUPABASE_WEBHOOK_SECRET in your environment variables
-- 3. Deploy the /api/webhooks/new-signup endpoint

-- Enable pg_net extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the function that sends the webhook
CREATE OR REPLACE FUNCTION notify_discord_new_signup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  webhook_url TEXT := 'https://www.tandemdaily.com/api/webhooks/new-signup';
  webhook_secret TEXT;
  provider TEXT;
BEGIN
  -- Get the webhook secret from Supabase vault (or use a default for testing)
  -- You can store this in Supabase Vault: SELECT vault.create_secret('supabase_webhook_secret', 'your-secret');
  -- webhook_secret := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_webhook_secret');

  -- For now, we'll send without auth and rely on the endpoint being internal
  -- You can add the secret later via vault

  -- Determine the auth provider
  provider := COALESCE(
    NEW.raw_app_meta_data->>'provider',
    'email'
  );

  -- Send the webhook using pg_net
  PERFORM net.http_post(
    url := webhook_url,
    body := jsonb_build_object(
      'email', NEW.email,
      'provider', provider,
      'created_at', NEW.created_at
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );

  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users table
DROP TRIGGER IF EXISTS on_new_user_signup_discord ON auth.users;

CREATE TRIGGER on_new_user_signup_discord
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION notify_discord_new_signup();
