import { useState } from 'react'
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignIn() {
    if (!email || !password) return Alert.alert('Error', 'Please enter your email and password.')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) Alert.alert('Error', error.message)
    else router.replace('/(tabs)')
    setLoading(false)
  }

  async function handleSignUp() {
    if (!email || !password) return Alert.alert('Error', 'Please enter your email and password.')
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) Alert.alert('Error', error.message)
    else if (data.session) router.replace('/(tabs)')
    else Alert.alert('Check your email', 'Confirmation link sent.')
    setLoading(false)
  }

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-3xl font-bold mb-2">Train with Sunny</Text>
      <Text className="text-gray-500 mb-8">Sign in to your account</Text>

      <TextInput
        className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4"
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-6"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        className="w-full bg-blue-500 rounded-lg py-3 items-center mb-3"
        onPress={handleSignIn}
        disabled={loading}
      >
        <Text className="text-white font-semibold text-base">
          {loading ? 'Loading...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="w-full border border-blue-500 rounded-lg py-3 items-center"
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text className="text-blue-500 font-semibold text-base">Create Account</Text>
      </TouchableOpacity>
    </View>
  )
}
