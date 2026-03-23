import { Text, View } from 'react-native'

export default function HabitsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold">Habits</Text>
      <Text className="text-gray-500 mt-2">Your training habits</Text>
    </View>
  )
}
