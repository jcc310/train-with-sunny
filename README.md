# train-with-sunny

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A gamified dog training habit tracker — think Habitica, but for training your dog. Build streaks, earn XP, level up your pup, and unlock achievements as you stay consistent with training sessions.

## Tech Stack

- **React Native** + **Expo** (expo-router for file-based navigation)
- **Supabase** (auth, PostgreSQL database, storage)
- **NativeWind** (Tailwind CSS for React Native)
- **TypeScript** throughout

## Project Structure

```
train-with-sunny/
├── apps/
│   └── mobile/           # Expo React Native app
│       ├── app/          # expo-router screens
│       │   ├── (auth)/   # Login / signup screens
│       │   └── (tabs)/   # Main tab navigation
│       └── lib/          # Shared utilities (Supabase client, etc.)
├── packages/
│   └── shared/           # Shared TypeScript types
└── supabase/
    └── migrations/       # Database schema migrations
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- A [Supabase](https://supabase.com) project

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/train-with-sunny.git
   cd train-with-sunny
   ```

2. **Install dependencies**

   ```bash
   cd apps/mobile
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env.local` in `apps/mobile` and fill in your Supabase credentials:

   ```bash
   cp .env.example apps/mobile/.env.local
   ```

   ```env
`   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`
   ```

4. **Apply database migrations**

   In your Supabase project dashboard (or using the Supabase CLI):

   ```bash
   supabase db push
   ```

5. **Start the development server**

   ```bash
   cd apps/mobile
   npx expo start
   ```

   Scan the QR code with Expo Go on your device, or press `i` for iOS simulator / `a` for Android emulator.

## Features

- Dog profiles with XP and leveling system
- Daily and weekly training habits
- Habit completion tracking with notes and duration
- Achievement unlocks
- Secure auth via Supabase (email/password)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

Please ensure your code passes type checks (`npx tsc --noEmit`) and linting (`npx eslint .`) before submitting.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
