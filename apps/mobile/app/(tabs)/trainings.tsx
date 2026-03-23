import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { Dog, Training, TrainingProgram } from '@train-with-sunny/shared'

interface TrainingWithCompletion extends Training {
  completedToday: boolean
}

interface ProgramSection {
  program: TrainingProgram
  trainings: TrainingWithCompletion[]
  expanded: boolean
}

const XP_PER_LEVEL = 100

function todayDateString() {
  return new Date().toISOString().split('T')[0]
}

export default function TrainingsScreen() {
  const [dog, setDog] = useState<Dog | null>(null)
  const [sections, setSections] = useState<ProgramSection[]>([])
  const [standaloneTrainings, setStandaloneTrainings] = useState<TrainingWithCompletion[]>([])
  const [availablePrograms, setAvailablePrograms] = useState<TrainingProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const router = useRouter()

  const loadData = useCallback(async () => {
    setLoading(true)
    const today = todayDateString()

    const { data: dogData } = await supabase
      .from('dogs')
      .select('*')
      .limit(1)
      .single()

    if (!dogData) {
      setLoading(false)
      return
    }

    setDog(dogData)

    const [trainingsRes, completionsRes, allProgramsRes, dogProgramsRes] = await Promise.all([
      supabase
        .from('habits')
        .select('*, program_steps(program_id)')
        .eq('dog_id', dogData.id)
        .eq('frequency', 'daily'),
      supabase
        .from('habit_completions')
        .select('habit_id')
        .eq('dog_id', dogData.id)
        .gte('completed_at', `${today}T00:00:00`)
        .lt('completed_at', `${today}T23:59:59`),
      supabase.from('training_programs').select('*').order('difficulty'),
      supabase
        .from('dog_programs')
        .select('program_id, training_programs(*)')
        .eq('dog_id', dogData.id)
        .eq('status', 'active'),
    ])

    const completedIds = new Set(
      (completionsRes.data ?? []).map((c: { habit_id: string }) => c.habit_id)
    )

    const allTrainings: TrainingWithCompletion[] = (trainingsRes.data ?? []).map(
      (t: Training & { program_steps: { program_id: string } | null }) => ({
        ...t,
        completedToday: completedIds.has(t.id),
      })
    )

    const enrolledProgramIds = new Set(
      (dogProgramsRes.data ?? []).map((dp: { program_id: string }) => dp.program_id)
    )
    const programMap = new Map<string, TrainingProgram>()
    for (const dp of dogProgramsRes.data ?? []) {
      if (dp.training_programs && !Array.isArray(dp.training_programs)) {
        programMap.set(dp.program_id, dp.training_programs as unknown as TrainingProgram)
      }
    }

    const allProgramIds = new Set((allProgramsRes.data ?? []).map((p: TrainingProgram) => p.id))

    const trainingsByProgram = new Map<string, TrainingWithCompletion[]>()
    const standalone: TrainingWithCompletion[] = []

    for (const training of allTrainings) {
      const programId = (training as TrainingWithCompletion & { program_steps: { program_id: string } | null })
        .program_steps?.program_id
      if (programId && programMap.has(programId)) {
        const existing = trainingsByProgram.get(programId) ?? []
        trainingsByProgram.set(programId, [...existing, training])
      } else if (!programId || !allProgramIds.has(programId)) {
        standalone.push(training)
      }
    }

    setSections(prev => {
      const prevExpanded = new Map(prev.map(s => [s.program.id, s.expanded]))
      return Array.from(programMap.entries()).map(([programId, program]) => ({
        program,
        trainings: trainingsByProgram.get(programId) ?? [],
        expanded: prevExpanded.get(programId) ?? true,
      }))
    })

    setStandaloneTrainings(standalone)
    setAvailablePrograms(
      (allProgramsRes.data ?? []).filter((p: TrainingProgram) => !enrolledProgramIds.has(p.id))
    )
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData])
  )

  const toggleSection = (programId: string) => {
    setSections(prev =>
      prev.map(s => s.program.id === programId ? { ...s, expanded: !s.expanded } : s)
    )
  }

  const enrollInProgram = async (program: TrainingProgram) => {
    if (!dog || enrolling) return
    setEnrolling(program.id)

    const { data: steps, error: stepsError } = await supabase
      .from('program_steps')
      .select('*')
      .eq('program_id', program.id)
      .order('step_order')

    if (stepsError || !steps || steps.length === 0) {
      Alert.alert('Error', 'Could not load program steps. Please try again.')
      setEnrolling(null)
      return
    }

    const { error: enrollError } = await supabase.from('dog_programs').insert({
      dog_id: dog.id,
      program_id: program.id,
      status: 'active',
    })

    if (enrollError) {
      Alert.alert('Error', enrollError.message)
      setEnrolling(null)
      return
    }

    const stepIds = steps.map((s: { id: string }) => s.id)
    const { data: existingTrainings } = await supabase
      .from('habits')
      .select('program_step_id')
      .eq('dog_id', dog.id)
      .in('program_step_id', stepIds)

    const existingStepIds = new Set(
      (existingTrainings ?? []).map((t: { program_step_id: string }) => t.program_step_id)
    )
    const newSteps = steps.filter((s: { id: string }) => !existingStepIds.has(s.id))

    if (newSteps.length > 0) {
      const trainingRows = newSteps.map((step: { id: string; title: string; description: string | null; xp_reward: number }) => ({
        dog_id: dog.id,
        title: step.title,
        description: step.description,
        frequency: 'daily',
        program_step_id: step.id,
        xp_reward: step.xp_reward,
      }))

      const { error: insertError } = await supabase.from('habits').insert(trainingRows)
      if (insertError) {
        Alert.alert('Error', insertError.message)
        setEnrolling(null)
        return
      }
    }

    setEnrolling(null)
    await loadData()
  }

  const removeProgram = (program: TrainingProgram) => {
    Alert.alert(
      `Remove "${program.title}"?`,
      'Your progress will be saved. You can re-add this program anytime to pick up where you left off.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!dog) return
            await supabase
              .from('dog_programs')
              .delete()
              .eq('dog_id', dog.id)
              .eq('program_id', program.id)
            await loadData()
          },
        },
      ]
    )
  }

  const completeTraining = async (training: TrainingWithCompletion) => {
    if (!dog || training.completedToday || completing) return
    setCompleting(training.id)

    await supabase.from('habit_completions').insert({
      habit_id: training.id,
      dog_id: dog.id,
    })

    const newXp = dog.xp + training.xp_reward
    const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1

    await supabase.from('dogs').update({ xp: newXp, level: newLevel }).eq('id', dog.id)

    setDog({ ...dog, xp: newXp, level: newLevel })

    const markDone = (t: TrainingWithCompletion) =>
      t.id === training.id ? { ...t, completedToday: true } : t

    setSections(prev => prev.map(s => ({ ...s, trainings: s.trainings.map(markDone) })))
    setStandaloneTrainings(prev => prev.map(markDone))
    setCompleting(null)
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    )
  }

  if (!dog) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-gray-500 text-center">
          Set up a dog profile first to start training.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 }}
    >
      <Text className="text-2xl font-bold mb-1">Daily Training</Text>
      <Text className="text-gray-500 mb-6">{dog.name} · Level {dog.level}</Text>

      {sections.map(({ program, trainings, expanded }) => {
        const done = trainings.filter(t => t.completedToday).length
        const total = trainings.length
        const progress = total > 0 ? done / total : 0

        return (
          <View key={program.id} className="mb-5">
            <View className="bg-indigo-50 border border-indigo-100 rounded-2xl mb-2 overflow-hidden">
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => toggleSection(program.id)}
                  className="flex-1 flex-row items-center px-4 pt-4 pb-2 active:opacity-70"
                >
                  <Text className="font-semibold text-indigo-800 text-base flex-1 mr-2">
                    {program.title}
                  </Text>
                  <Text className="text-indigo-500 text-sm mr-2">{done}/{total}</Text>
                  <Text className="text-indigo-400 text-sm">{expanded ? '▲' : '▼'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => removeProgram(program)}
                  className="px-4 pt-4 pb-2 active:opacity-60"
                >
                  <Text className="text-red-400 text-sm font-medium">Remove</Text>
                </Pressable>
              </View>

              <View className="px-4 pb-4">
                <View className="bg-indigo-200 rounded-full h-2">
                  <View
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${progress * 100}%` }}
                  />
                </View>
                {done === total && total > 0 && (
                  <Text className="text-indigo-600 text-xs font-medium mt-2">
                    All done for today!
                  </Text>
                )}
              </View>
            </View>

            {expanded && trainings.map(training => (
              <TrainingRow
                key={training.id}
                training={training}
                completing={completing === training.id}
                onComplete={() => completeTraining(training)}
                onInfo={
                  training.program_step_id
                    ? () => router.push(`/step/${training.program_step_id}`)
                    : undefined
                }
              />
            ))}
          </View>
        )
      })}

      {standaloneTrainings.length > 0 && (
        <View className="mb-5">
          {sections.length > 0 && (
            <Text className="font-semibold text-gray-700 mb-3">Other Trainings</Text>
          )}
          {standaloneTrainings.map(training => (
            <TrainingRow
              key={training.id}
              training={training}
              completing={completing === training.id}
              onComplete={() => completeTraining(training)}
            />
          ))}
        </View>
      )}

      {sections.length === 0 && standaloneTrainings.length === 0 && availablePrograms.length === 0 && (
        <Text className="text-gray-400 text-center mt-8">No trainings yet.</Text>
      )}

      {availablePrograms.length > 0 && (
        <>
          <Text className="text-lg font-semibold mb-3 mt-2">Add a Program</Text>
          {availablePrograms.map(program => (
            <View
              key={program.id}
              className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-3"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-3">
                  <Text className="font-semibold text-blue-800 text-base">{program.title}</Text>
                  {program.description ? (
                    <Text className="text-blue-600 text-sm mt-1">{program.description}</Text>
                  ) : null}
                  <Text className="text-blue-400 text-xs mt-2 uppercase tracking-wide">
                    {program.difficulty}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push(`/program/${program.id}`)}
                  hitSlop={8}
                  className="mt-0.5 active:opacity-60"
                >
                  <Text className="text-blue-400 text-lg">ⓘ</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => enrollInProgram(program)}
                disabled={enrolling === program.id}
                className="mt-3 bg-blue-500 rounded-xl py-2.5 items-center active:opacity-80"
              >
                <Text className="text-white font-semibold text-sm">
                  {enrolling === program.id ? 'Starting...' : 'Start Program'}
                </Text>
              </Pressable>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  )
}

function TrainingRow({
  training,
  completing,
  onComplete,
  onInfo,
}: {
  training: TrainingWithCompletion
  completing: boolean
  onComplete: () => void
  onInfo?: () => void
}) {
  return (
    <Pressable
      onPress={onComplete}
      disabled={training.completedToday || completing}
      className={[
        'rounded-2xl p-4 mb-2 flex-row items-start',
        training.completedToday
          ? 'bg-green-50 border border-green-200'
          : 'bg-gray-50 border border-gray-200 active:opacity-70',
      ].join(' ')}
    >
      <View
        className={[
          'w-6 h-6 rounded-full border-2 mr-3 mt-0.5 items-center justify-center flex-shrink-0',
          training.completedToday ? 'bg-green-500 border-green-500' : 'border-gray-300',
        ].join(' ')}
      >
        {training.completedToday && (
          <Text className="text-white text-xs font-bold">✓</Text>
        )}
      </View>
      <View className="flex-1">
        <Text
          className={[
            'font-semibold text-base',
            training.completedToday ? 'text-green-700 line-through' : 'text-gray-800',
          ].join(' ')}
        >
          {training.title}
        </Text>
        {training.description ? (
          <Text className="text-gray-500 text-sm mt-0.5">{training.description}</Text>
        ) : null}
        <Text className="text-xs mt-1 font-medium text-amber-600">
          +{training.xp_reward} XP
        </Text>
      </View>
      {onInfo && (
        <Pressable onPress={onInfo} hitSlop={8} className="ml-2 mt-0.5 active:opacity-60">
          <Text className="text-blue-400 text-lg">ⓘ</Text>
        </Pressable>
      )}
    </Pressable>
  )
}
