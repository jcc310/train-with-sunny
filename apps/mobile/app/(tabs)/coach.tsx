import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { Dog } from '@train-with-sunny/shared'
import { useTrainingAgent } from '../../hooks/useTrainingAgent'

export default function CoachScreen() {
  const [dog, setDog] = useState<Dog | null>(null)
  const [input, setInput] = useState('')
  const scrollRef = useRef<ScrollView>(null)
  const { messages, sendMessage, loading, error, clearMessages } = useTrainingAgent(dog)

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('dogs')
        .select('*')
        .limit(1)
        .single()
        .then(({ data }) => setDog(data))
    }, [])
  )

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    await sendMessage(text)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 5}
    >
      {/* Header */}
      <View className="px-6 pt-14 pb-4 border-b border-gray-100 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-gray-900">AI Coach</Text>
          {dog && (
            <Text className="text-sm text-gray-400 mt-0.5">Training {dog.name}</Text>
          )}
        </View>
        {messages.length > 0 && (
          <Pressable onPress={clearMessages} className="active:opacity-60">
            <Text className="text-sm text-gray-400">Clear</Text>
          </Pressable>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View className="items-center mt-12 px-6">
            <Text className="text-4xl mb-4">🐕</Text>
            <Text className="text-lg font-semibold text-gray-800 text-center mb-2">
              Your personal dog trainer
            </Text>
            <Text className="text-gray-400 text-center text-sm leading-5">
              Tell me about your dog and what you'd like to work on. I'll build a custom training
              program using Zak George's positive reinforcement methods.
            </Text>
            <View className="mt-6 w-full gap-2">
              {[
                'Help me teach my puppy to sit and stay',
                'My dog pulls on the leash — where do I start?',
                'Create a 4-week beginner program',
              ].map(prompt => (
                <Pressable
                  key={prompt}
                  onPress={() => sendMessage(prompt)}
                  className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 active:opacity-70"
                >
                  <Text className="text-indigo-700 text-sm">{prompt}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {messages.map((msg, i) => (
          <View
            key={i}
            className={[
              'mb-3 max-w-5/6',
              msg.role === 'user' ? 'self-end' : 'self-start',
            ].join(' ')}
          >
            <View
              className={[
                'rounded-2xl px-4 py-3',
                msg.role === 'user'
                  ? 'bg-indigo-500'
                  : 'bg-gray-100',
              ].join(' ')}
            >
              <Text
                className={[
                  'text-sm leading-5',
                  msg.role === 'user' ? 'text-white' : 'text-gray-800',
                ].join(' ')}
              >
                {msg.content}
              </Text>
            </View>
          </View>
        ))}

        {loading && (
          <View className="self-start mb-3">
            <View className="bg-gray-100 rounded-2xl px-4 py-3">
              <ActivityIndicator size="small" color="#6366f1" />
            </View>
          </View>
        )}

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-3">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View className="px-3 pb-3 pt-2 border-t border-gray-100 flex-row items-end gap-2">
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask your coach..."
          placeholderTextColor="#9ca3af"
          multiline
          className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 text-sm max-h-32"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <Pressable
          onPress={handleSend}
          disabled={!input.trim() || loading}
          className={[
            'w-11 h-11 rounded-full items-center justify-center',
            input.trim() && !loading ? 'bg-indigo-500 active:opacity-80' : 'bg-gray-200',
          ].join(' ')}
        >
          <Text className={input.trim() && !loading ? 'text-white' : 'text-gray-400'}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
