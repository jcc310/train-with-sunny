import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useNavigation, useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { TrainingProgram, ProgramStep } from '@train-with-sunny/shared'

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const navigation = useNavigation()
  const router = useRouter()

  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [steps, setSteps] = useState<ProgramStep[]>([])
  const [enrolled, setEnrolled] = useState(false)
  const [dogId, setDogId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [programRes, stepsRes, dogRes] = await Promise.all([
          supabase.from('training_programs').select('*').eq('id', id).single(),
          supabase.from('program_steps').select('*').eq('program_id', id).order('step_order'),
          supabase.from('dogs').select('id').limit(1).single(),
        ])

        setProgram(programRes.data)
        setSteps(stepsRes.data ?? [])

        if (programRes.data?.title) {
          navigation.setOptions({ title: programRes.data.title })
        }

        if (dogRes.data) {
          setDogId(dogRes.data.id)
          const { data: dp } = await supabase
            .from('dog_programs')
            .select('id')
            .eq('dog_id', dogRes.data.id)
            .eq('program_id', id)
            .maybeSingle()
          setEnrolled(!!dp)
        }

        setLoading(false)
      }
      load()
    }, [id, navigation])
  )

  const enroll = async () => {
    if (!dogId || !program || enrolling) return
    setEnrolling(true)

    await supabase.from('dog_programs').insert({
      dog_id: dogId,
      program_id: program.id,
      status: 'active',
    })

    // Only create habits that don't already exist (preserves history on re-enrollment)
    const { data: existingHabits } = await supabase
      .from('habits')
      .select('program_step_id')
      .eq('dog_id', dogId)
      .in('program_step_id', steps.map(s => s.id))

    const existingStepIds = new Set((existingHabits ?? []).map((h: { program_step_id: string }) => h.program_step_id))
    const newSteps = steps.filter(s => !existingStepIds.has(s.id))

    if (newSteps.length > 0) {
      const habitRows = newSteps.map(step => ({
        dog_id: dogId,
        title: step.title,
        description: step.description,
        frequency: 'daily',
        program_step_id: step.id,
        xp_reward: step.xp_reward,
      }))
      await supabase.from('habits').insert(habitRows)
    }
    setEnrolled(true)
    setEnrolling(false)
    router.back()
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
        <Text className="text-gray-500">Program not found.</Text>
      </View>
    )
  }

  const totalXp = steps.reduce((sum, s) => sum + s.xp_reward, 0)

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
    >
      {/* Header */}
      <View className="mb-2">
        <View className="flex-row items-center gap-3 mb-2">
          <View className="bg-indigo-100 px-3 py-1 rounded-full">
            <Text className="text-indigo-600 text-xs font-semibold uppercase tracking-wide">
              {program.difficulty}
            </Text>
          </View>
          <View className="bg-amber-100 px-3 py-1 rounded-full">
            <Text className="text-amber-700 text-xs font-semibold">+{totalXp} XP total</Text>
          </View>
        </View>
        {program.description && (
          <Text className="text-gray-500 text-base leading-relaxed">{program.description}</Text>
        )}
      </View>

      {/* Steps */}
      <Text className="text-lg font-semibold text-gray-800 mt-6 mb-3">
        {steps.length} Daily Steps
      </Text>

      {steps.map((step, index) => (
        <View
          key={step.id}
          className="flex-row mb-4"
        >
          {/* Step number + connector */}
          <View className="items-center mr-4">
            <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center">
              <Text className="text-indigo-600 font-bold text-sm">{index + 1}</Text>
            </View>
            {index < steps.length - 1 && (
              <View className="w-0.5 flex-1 bg-indigo-100 mt-1" />
            )}
          </View>

          {/* Step content */}
          <View className="flex-1 pb-4">
            <View className="flex-row justify-between items-start mb-1">
              <Text className="font-semibold text-gray-800 text-base flex-1 mr-2">
                {step.title}
              </Text>
              <Text className="text-amber-600 text-xs font-medium mt-0.5">
                +{step.xp_reward} XP
              </Text>
            </View>
            {step.description && (
              <Text className="text-gray-500 text-sm leading-relaxed">{step.description}</Text>
            )}
          </View>
        </View>
      ))}

      {/* Enroll / already enrolled */}
      {enrolled ? (
        <View className="mt-4 bg-green-50 border border-green-200 rounded-2xl py-4 items-center">
          <Text className="text-green-700 font-semibold">Already enrolled</Text>
        </View>
      ) : (
        <Pressable
          onPress={enroll}
          disabled={enrolling}
          className="mt-4 bg-indigo-500 rounded-2xl py-4 items-center active:opacity-80"
        >
          <Text className="text-white font-semibold text-base">
            {enrolling ? 'Starting...' : 'Start Program'}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  )
}
