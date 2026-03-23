import { Text, View } from 'react-native'

export default function DogsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold">My Dogs</Text>
      <Text className="text-gray-500 mt-2">Manage your dog profiles</Text>
    </View>
  )
}
