/*
  # Configure daily push notification alerts cron job

  1. Changes
    - Creates a pg_cron job that runs daily at 8:00 AM UTC
    - The job calls the push-notifications edge function /check-alerts endpoint
    - Uses pg_net to make an HTTP POST request to the edge function

  2. Important Notes
    - pg_cron and pg_net extensions must already be enabled
    - The cron job runs server-side, no client involvement needed
    - Checks loyalty end alerts (3, 2, 1, 0 days remaining)
    - Checks lead follow-up alerts (overdue or today)
    - Respects user notification preferences
*/

SELECT cron.schedule(
  'daily-push-alerts',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kzvzjrgmqneqygwfihzw.supabase.co/functions/v1/push-notifications/check-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6dnpqcmdtcW5lcXlnd2ZpaHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNTQ5NjAsImV4cCI6MjA4MjkzMDk2MH0.jTpjTMRtI1mM9eNrKTnLXeVKWEtkUFji_h7HAJyp4HI'
    ),
    body := '{}'::jsonb
  );
  $$
);
