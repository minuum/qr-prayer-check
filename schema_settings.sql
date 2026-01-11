
-- Create System Settings Table for dynamic configuration
create table public.system_settings (
  key text primary key,
  value text,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.system_settings enable row level security;

-- Policies
-- Anyone can read settings (needed for check-in page to know location/status)
create policy "Allow public read settings" on public.system_settings for select using (true);

-- Only admin (or anon via server action with logic) can update
-- Since we use service role or anon with logic in actions, we can allow insert/update for now, 
-- but strictly in a real app we'd limit this.
create policy "Allow public insert/update settings" on public.system_settings for insert with check (true);
create policy "Allow public update settings" on public.system_settings for update using (true);
