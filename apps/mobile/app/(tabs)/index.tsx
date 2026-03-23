import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Dog } from '../../../packages/shared/types'

export default function HomeScreen() {
  const [dog, setDog] = useState<Dog | null>(null)

  useEffect(() => {
    supabase
      .from('dogs')
      .select('*')
      .limit(1)
      .single()
      .then(({ data }) => setDog(data))
  }, [])

  const xpForNextLevel = 100
  const xpProgress = dog ? (dog.xp % xpForNextLevel) / xpForNextLevel : 0

  return (
    <View className="flex-1 bg-white px-6 pt-14">
      {dog ? (
        <>
          <Text className="text-3xl font-bold mt-4">
            Ready to train {dog.name} today? 🐾
          </Text>
          <Text className="text-gray-500 mt-1 mb-8">{dog.breed ?? 'Good pup'}</Text>

          <View className="bg-blue-50 rounded-2xl p-5">
            <View className="flex-row justify-between mb-2">
              <Text className="font-semibold text-gray-700">Level {dog.level}</Text>
              <Text className="text-gray-500 text-sm">{dog.xp % xpForNextLevel} / {xpForNextLevel} XP</Text>
            </View>
            <View className="bg-gray-200 rounded-full h-3">
              <View
                className="bg-blue-500 h-3 rounded-full"
                style={{ width: `${xpProgress * 100}%` }}
              />
            </View>
            <Text className="text-gray-500 text-sm mt-2">
              {xpForNextLevel - (dog.xp % xpForNextLevel)} XP until Level {dog.level + 1}
            </Text>
          </View>
        </>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Loading...</Text>
        </View>
      )}
    </View>
  )
}
