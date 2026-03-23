I'm building an open source, gamified dog training habit app called "sunny-levels-up" 
(inspired by Habitica but for dog training). 

Please set up the initial project structure using:
- React Native with Expo (latest SDK)
- Supabase (for database, auth, and storage)
- TypeScript throughout
- NativeWind (Tailwind for React Native) for styling

## Project Structure to Create

apps/
  mobile/          # Expo React Native app
packages/
  shared/          # Shared TypeScript types
supabase/
  migrations/      # Database migrations
  functions/       # Edge functions
.github/
  workflows/       # CI

## Tasks

1. Initialize the Expo app inside apps/mobile using:
   npx create-expo-app mobile --template expo-template-blank-typescript

2. Install core dependencies in apps/mobile:
   - @supabase/supabase-js
   - @react-native-async-storage/async-storage
   - react-native-url-polyfill
   - nativewind
   - tailwindcss
   - expo-router (for file-based navigation)
   - expo-secure-store

3. Set up Supabase client in apps/mobile/lib/supabase.ts
   using env variables EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

4. Create a .env.example with those two variables blanked out

5. Create the initial Supabase migration file at 
   supabase/migrations/0001_initial_schema.sql with these tables:

   - profiles (id, username, avatar_url, created_at)
     - id references auth.users
   
   - dogs (id, owner_id, name, breed, age, avatar_url, xp, level, created_at)
     - owner_id references profiles
   
   - habits (id, dog_id, title, description, frequency, created_at)
     - frequency is an enum: 'daily' | 'weekly'
     - dog_id references dogs
   
   - habit_completions (id, habit_id, dog_id, completed_at, notes, duration_seconds)
     - habit_id references habits
     - dog_id references dogs
   
   - achievements (id, dog_id, title, description, unlocked_at)
     - dog_id references dogs

   Add Row Level Security (RLS) policies so users can only read/write their own data.

6. Create a basic folder structure inside apps/mobile/app/ using expo-router:
   - (auth)/login.tsx     # Login screen placeholder
   - (tabs)/index.tsx     # Home/dashboard placeholder
   - (tabs)/dogs.tsx      # Dogs list placeholder
   - (tabs)/habits.tsx    # Habits list placeholder

7. Create shared TypeScript types in packages/shared/types.ts 
   matching the database schema above

8. Create a basic GitHub Actions CI workflow at .github/workflows/ci.yml 
   that runs on push and does: npm install, type-check, and lint

9. Create a root README.md that includes:
   - Project description
   - Tech stack
   - How to run locally (setup steps)
   - How to contribute
   - MIT license badge

After setup, give me a summary of what was created and the exact commands 
I need to run to get the app running on my local device with Expo Go.