-- Add people_on_jump field to jumps table
-- Optional integer: number of people on the jump (including the jumper)

ALTER TABLE jumps
  ADD COLUMN IF NOT EXISTS people_on_jump integer NULL;

COMMENT ON COLUMN jumps.people_on_jump IS 'Number of people on the jump (optional)';
