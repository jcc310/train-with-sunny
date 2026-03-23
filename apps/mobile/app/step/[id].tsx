import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { WebView } from 'react-native-webview'
import Markdown from 'react-native-markdown-display'
import { supabase } from '../../lib/supabase'
import { ProgramStep } from '@train-with-sunny/shared'

function youtubeEmbedHtml(videoId: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000; }
          iframe { width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <iframe
          src="https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </body>
    </html>
  `
}

export default function StepDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const navigation = useNavigation()
  const [step, setStep] = useState<ProgramStep | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('program_steps')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setStep(data)
        setLoading(false)
        if (data?.title) {
          navigation.setOptions({ title: data.title })
        }
      })
  }, [id, navigation])

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    )
  }

  if (!step) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-gray-500">Step not found.</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Video */}
      {step.video_id && step.video_provider === 'youtube' && (
        <View style={{ height: 220, backgroundColor: '#000' }}>
          <WebView
            source={{ html: youtubeEmbedHtml(step.video_id) }}
            style={{ flex: 1 }}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
          />
        </View>
      )}

      <View className="px-6 pt-6">
        {/* XP badge */}
        <View className="flex-row items-center mb-3">
          <View className="bg-amber-100 px-3 py-1 rounded-full">
            <Text className="text-amber-700 text-xs font-semibold">+{step.xp_reward} XP</Text>
          </View>
        </View>

        <Text className="text-2xl font-bold text-gray-900 mb-2">{step.title}</Text>

        {step.description && (
          <Text className="text-gray-500 text-base mb-6">{step.description}</Text>
        )}

        {/* Walkthrough */}
        {step.walkthrough && (
          <>
            <Text className="text-lg font-semibold text-gray-800 mb-3">How to do it</Text>
            <Markdown
              style={{
                body: { color: '#374151', fontSize: 15, lineHeight: 24 },
                heading2: { fontSize: 17, fontWeight: '600', marginTop: 16, marginBottom: 8 },
                bullet_list: { marginBottom: 8 },
                ordered_list: { marginBottom: 8 },
                strong: { fontWeight: '700' },
              }}
            >
              {step.walkthrough}
            </Markdown>
          </>
        )}

        {!step.walkthrough && !step.video_id && (
          <Text className="text-gray-400 text-center mt-8">
            No walkthrough available yet for this step.
          </Text>
        )}

      </View>
    </ScrollView>
  )
}
