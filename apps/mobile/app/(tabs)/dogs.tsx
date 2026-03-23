import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { Dog } from '@train-with-sunny/shared'

const XP_PER_LEVEL = 100

function calcAge(birthday: string | null): string {
  if (!birthday) return 'Age unknown'
  const birth = new Date(birthday)
  const now = new Date()
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  if (months < 1) return 'Less than 1 month'
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} old`
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (rem === 0) return `${years} year${years === 1 ? '' : 's'} old`
  return `${years}y ${rem}m old`
}

export default function DogsScreen() {
  const [dogs, setDogs] = useState<Dog[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('dogs')
        .select('*')
        .order('created_at')
        .then(({ data }) => {
          setDogs(data ?? [])
          setLoading(false)
        })
    }, [])
  )

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 }}
    >
      <Text className="text-2xl font-bold mb-1">My Dogs</Text>
      <Text className="text-gray-500 mb-6">
        {dogs.length === 0 ? 'No dogs yet' : `${dogs.length} dog${dogs.length === 1 ? '' : 's'}`}
      </Text>

      {dogs.map(dog => {
        const xpProgress = (dog.xp % XP_PER_LEVEL) / XP_PER_LEVEL
        const xpInLevel = dog.xp % XP_PER_LEVEL
        const initials = dog.name.slice(0, 2).toUpperCase()

        return (
          <View key={dog.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-4">
            <View className="flex-row items-center mb-4">
              {/* Avatar placeholder */}
              <View className="w-14 h-14 rounded-full bg-indigo-100 items-center justify-center mr-4">
                <Text className="text-indigo-600 text-lg font-bold">{initials}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900">{dog.name}</Text>
                <Text className="text-gray-500 text-sm">
                  {dog.breed ?? 'Unknown breed'} · {calcAge(dog.birthday)}
                </Text>
              </View>
              <View className="bg-indigo-100 px-3 py-1 rounded-full">
                <Text className="text-indigo-700 font-semibold text-sm">Lv {dog.level}</Text>
              </View>
            </View>

            {/* XP bar */}
            <View className="flex-row justify-between mb-1">
              <Text className="text-xs text-gray-500 font-medium">XP</Text>
              <Text className="text-xs text-gray-500">{xpInLevel} / {XP_PER_LEVEL}</Text>
            </View>
            <View className="bg-gray-200 rounded-full h-2">
              <View
                className="bg-indigo-500 h-2 rounded-full"
                style={{ width: `${xpProgress * 100}%` }}
              />
            </View>
            <Text className="text-xs text-gray-400 mt-1">
              {XP_PER_LEVEL - xpInLevel} XP to Level {dog.level + 1}
            </Text>
          </View>
        )
      })}

      {/* Add dog button */}
      <Pressable
        onPress={() => router.push('/dog-setup')}
        className="flex-row items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl py-5 mt-2 active:opacity-70"
      >
        <Ionicons name="add-circle-outline" size={22} color="#9ca3af" />
        <Text className="text-gray-400 font-medium ml-2">Add another dog</Text>
      </Pressable>
    </ScrollView>
  )
}
