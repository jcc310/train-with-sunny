-- Create frequency enum
CREATE TYPE frequency AS ENUM ('daily', 'weekly');

-- Profiles table
CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Dogs table
CREATE TABLE dogs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  breed text,
  age integer,
  avatar_url text,
  xp integer DEFAULT 0,
  level integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Habits table
CREATE TABLE habits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id uuid REFERENCES dogs(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  frequency frequency NOT NULL DEFAULT 'daily',
  created_at timestamptz DEFAULT now()
);

-- Habit completions table
CREATE TABLE habit_completions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id uuid REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  dog_id uuid REFERENCES dogs(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamptz DEFAULT now(),
  notes text,
  duration_seconds integer
);

-- Achievements table
CREATE TABLE achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id uuid REFERENCES dogs(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  unlocked_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Dogs policies
CREATE POLICY "Users can view their own dogs"
  ON dogs FOR SELECT
  USING (
    owner_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own dogs"
  ON dogs FOR INSERT
  WITH CHECK (
    owner_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own dogs"
  ON dogs FOR UPDATE
  USING (
    owner_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own dogs"
  ON dogs FOR DELETE
  USING (
    owner_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

-- Habits policies
CREATE POLICY "Users can view habits for their dogs"
  ON habits FOR SELECT
  USING (
    dog_id IN (
      SELECT id FROM dogs WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert habits for their dogs"
  ON habits FOR INSERT
  WITH CHECK (
    dog_id IN (
      SELECT id FROM dogs WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update habits for their dogs"
  ON habits FOR UPDATE
  USING (
    dog_id IN (
      SELECT id FROM dogs WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete habits for their dogs"
  ON habits FOR DELETE
  USING (
    dog_id IN (
      SELECT id FROM dogs WHERE owner_id = auth.uid()
    )
  );

-- Habit completions policies
CREATE POLICY "Users can view completions for their dogs"
  ON habit_completions FOR SELECT
  USING (
    dog_id IN (
      SELECT id FROM dogs WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert completions for their dogs"
  ON habit_completions FOR INSERT
  WITH CHECK (
    dog_id IN (
      SELECT id FROM dogs WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update completions for their dogs"
  ON habit_completions FOR UPDATE
  USING (
    dog_id IN (
      SELECT id FROM dogs WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete completions for their dogs"
  ON habit_completions FOR DELETE
  USING (
    dog_id IN (
      SELECT id FROM dogs WHERE owner_id = auth.uid()
    )
  );

-- Achievements policies
CREATE POLICY "Users can view achievements for their dogs"
  ON achievements FOR SELECT
  USING (
    dog_id IN (
      SELECT id FROM dogs WHERE owner_id = auth.uid()
    )
  );
