CREATE TABLE IF NOT EXISTS user_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  year_month DATE NOT NULL, -- Use the 1st of the month to represent the month
  target_count INTEGER DEFAULT 10,
  UNIQUE(user_id, year_month)
);
