import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { AgentProgram } from '@train-with-sunny/shared'

interface ProgramSession {
  dayNumber: number
  skill: string
  exercise: string
  durationMins: number
  steps: string[]
  successCriteria?: string
}

interface ProgramWeek {
  weekNumber: number
  theme: string
  sessions: ProgramSession[]
}

interface ProgramData {
  programName: string
  durationWeeks: number
  weeks: ProgramWeek[]
}

export default function ProgramPreview() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [program, setProgram] = useState<AgentProgram | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    supabase
      .from('agent_programs')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setProgram(data)
        setLoading(false)
      })
  }, [id])

  function calculateDate(dayNumber: number): string {
    const date = new Date()
    date.setDate(date.getDate() + dayNumber - 1)
    return date.toISOString().split('T')[0]
  }

  async function confirmProgram() {
    if (!program) return
    setConfirming(true)

    await supabase
      .from('agent_programs')
      .update({ status: 'active', confirmed_at: new Date().toISOString() })
      .eq('id', id)

    const programData = program.program_data as ProgramData
    const sessions = programData.weeks.flatMap((week: ProgramWeek) =>
      week.sessions.map((s: ProgramSession) => ({
        program_id:    id,
        user_id:       program.user_id,
        dog_id:        program.dog_id,
        week_number:   week.weekNumber,
        day_number:    s.dayNumber,
        skill:         s.skill,
        exercise:      s.exercise,
        duration_mins: s.durationMins,
        steps:         s.steps,
        scheduled_for: calculateDate(s.dayNumber),
      }))
    )

    await supabase.from('agent_sessions').insert(sessions)
    setConfirming(false)
    router.replace('/(tabs)')
  }

  async function rejectProgram() {
    Alert.alert(
      'Reject Program?',
      'You can go back to chat and ask for revisions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('agent_programs')
              .update({ status: 'rejected' })
              .eq('id', id)
            router.back()
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    )
  }

  if (!program) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-gray-500 text-center">Program not found.</Text>
      </View>
    )
  }

  const programData = program.program_data as ProgramData

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 120 }}
    >
      <Text className="text-2xl font-bold mb-1">{programData.programName}</Text>
      <Text className="text-gray-500 mb-6">
        {programData.durationWeeks} week{programData.durationWeeks !== 1 ? 's' : ''} · AI-generated
      </Text>

      {programData.weeks.map((week: ProgramWeek) => (
        <View key={week.weekNumber} className="mb-6">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center mr-3">
              <Text className="text-indigo-700 font-bold text-sm">{week.weekNumber}</Text>
            </View>
            <Text className="font-semibold text-gray-800 text-base">{week.theme}</Text>
          </View>

          {week.sessions.map((session: ProgramSession) => (
            <View
              key={session.dayNumber}
              className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-3 ml-11"
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text className="font-semibold text-gray-800">Day {session.dayNumber}</Text>
                <Text className="text-xs text-gray-400">{session.durationMins} min</Text>
              </View>
              <Text className="text-indigo-600 font-medium text-sm mb-1">{session.skill}</Text>
              <Text className="text-gray-600 text-sm mb-3">{session.exercise}</Text>

              {session.steps.map((step: string, i: number) => (
                <View key={i} className="flex-row mb-1">
                  <Text className="text-gray-400 text-sm mr-2">{i + 1}.</Text>
                  <Text className="text-gray-600 text-sm flex-1">{step}</Text>
                </View>
              ))}

              {session.successCriteria && (
                <View className="mt-2 bg-green-50 rounded-lg px-3 py-2">
                  <Text className="text-green-700 text-xs">
                    Success: {session.successCriteria}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ))}

      <View className="fixed bottom-0 left-0 right-0 flex-row gap-3 mt-4">
        <Pressable
          onPress={rejectProgram}
          className="flex-1 border border-gray-300 rounded-2xl py-4 items-center active:opacity-70"
        >
          <Text className="text-gray-600 font-semibold">Revise</Text>
        </Pressable>
        <Pressable
          onPress={confirmProgram}
          disabled={confirming}
          className="flex-2 bg-indigo-500 rounded-2xl py-4 px-8 items-center active:opacity-80"
        >
          <Text className="text-white font-semibold">
            {confirming ? 'Starting...' : 'Start Program'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}
