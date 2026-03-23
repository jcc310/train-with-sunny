# sunny-levels-up

## Project Overview
Gamified dog training habit app. Habitica-style but for dog training.
Built with React Native (Expo) + Supabase + TypeScript.

## Tech Stack
- React Native + Expo + expo-router
- Supabase (auth, database, storage)
- NativeWind for styling
- TypeScript throughout

## Project Structure
apps/mobile       # Expo app
packages/shared   # Shared types
supabase/         # Migrations and edge functions

## Code Style
- Always use TypeScript, never plain JS
- Functional components only, no class components
- Use NativeWind for all styling
- Keep components small and single-purpose

## Commands
- Start app: cd apps/mobile && npx expo start
- Type check: npx tsc --noEmit
- Lint: npx eslint .

## Current Priorities
1. Initial project scaffold
2. Supabase schema + auth flow
3. Dog profile creation