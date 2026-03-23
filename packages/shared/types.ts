export type FrequencyType = 'daily' | 'weekly'

export interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  created_at: string
}

export interface Dog {
  id: string
  owner_id: string
  name: string
  breed: string | null
  birthday: string | null
  avatar_url: string | null
  xp: number
  level: number
  created_at: string
}

export interface Habit {
  id: string
  dog_id: string
  title: string
  description: string | null
  frequency: FrequencyType
  created_at: string
}

export interface HabitCompletion {
  id: string
  habit_id: string
  dog_id: string
  completed_at: string
  notes: string | null
  duration_seconds: number | null
}

export interface Achievement {
  id: string
  dog_id: string
  title: string
  description: string | null
  unlocked_at: string
}
