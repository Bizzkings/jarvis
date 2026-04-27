-- Jarvis voice assistant tables
-- Run once in the Supabase SQL Editor (fsomozssvpnlkqfbjupy)

CREATE TABLE IF NOT EXISTS jarvis_tasks (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'done', 'cancelled')),
  priority   TEXT NOT NULL DEFAULT 'normal'
               CHECK (priority IN ('low', 'normal', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jarvis_metrics (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  label      TEXT NOT NULL,   -- e.g. 'revenue', 'orders', 'leads'
  value      NUMERIC NOT NULL,
  unit       TEXT,             -- e.g. 'USD', 'count'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on both tables.
-- All reads/writes go through API routes that use the service-role key,
-- so the anon key has no direct access.
ALTER TABLE jarvis_tasks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_metrics ENABLE ROW LEVEL SECURITY;

-- Optional: seed a few example tasks for immediate testing
INSERT INTO jarvis_tasks (title) VALUES
  ('Review weekly report'),
  ('Follow up with the supplier'),
  ('Update product catalog');

-- Optional: seed today''s metrics for testing the report agent
INSERT INTO jarvis_metrics (label, value, unit) VALUES
  ('revenue',  1240, 'USD'),
  ('orders',     14, 'count'),
  ('leads',       3, 'count');
