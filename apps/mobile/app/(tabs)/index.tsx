import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
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

export default function HomeScreen() {
  const [dog, setDog] = useState<Dog | null>(null)
  const [sections, setSections] = useState<ProgramSection[]>([])
  const [standaloneTrainings, setStandaloneTrainings] = useState<TrainingWithCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

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

    const [trainingsRes, completionsRes, dogProgramsRes] = await Promise.all([
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

    const programMap = new Map<string, TrainingProgram>()
    for (const dp of dogProgramsRes.data ?? []) {
      if (dp.training_programs && !Array.isArray(dp.training_programs)) {
        programMap.set(dp.program_id, dp.training_programs as unknown as TrainingProgram)
      }
    }

    const trainingsByProgram = new Map<string, TrainingWithCompletion[]>()
    const standalone: TrainingWithCompletion[] = []

    for (const training of allTrainings) {
      const programId = (training as TrainingWithCompletion & { program_steps: { program_id: string } | null })
        .program_steps?.program_id
      if (programId && programMap.has(programId)) {
        const existing = trainingsByProgram.get(programId) ?? []
        trainingsByProgram.set(programId, [...existing, training])
      } else {
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

  const xpProgress = (dog.xp % XP_PER_LEVEL) / XP_PER_LEVEL
  const allTrainings = [...sections.flatMap(s => s.trainings), ...standaloneTrainings]
  const totalDone = allTrainings.filter(t => t.completedToday).length
  const totalCount = allTrainings.length

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 }}
    >
      <Text className="text-3xl font-bold mt-4">
        Ready to train {dog.name}?
      </Text>
      <Text className="text-gray-500 mt-1 mb-6">{dog.breed ?? 'Good pup'}</Text>

      {/* XP bar */}
      <View className="bg-blue-50 rounded-2xl p-5 mb-6">
        <View className="flex-row justify-between mb-2">
          <Text className="font-semibold text-gray-700">Level {dog.level}</Text>
          <Text className="text-gray-500 text-sm">
            {dog.xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP
          </Text>
        </View>
        <View className="bg-gray-200 rounded-full h-3">
          <View
            className="bg-blue-500 h-3 rounded-full"
            style={{ width: `${xpProgress * 100}%` }}
          />
        </View>
        <Text className="text-gray-500 text-sm mt-2">
          {XP_PER_LEVEL - (dog.xp % XP_PER_LEVEL)} XP until Level {dog.level + 1}
        </Text>
      </View>

      {/* Today's summary */}
      {totalCount > 0 && (
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold text-gray-800">Today's Training</Text>
          <Text className="text-sm text-gray-500">{totalDone}/{totalCount} done</Text>
        </View>
      )}

      {/* Program sections */}
      {sections.map(({ program, trainings, expanded }) => {
        const done = trainings.filter(t => t.completedToday).length
        const total = trainings.length
        const progress = total > 0 ? done / total : 0

        return (
          <View key={program.id} className="mb-5">
            <Pressable
              onPress={() => toggleSection(program.id)}
              className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-2 active:opacity-80"
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-semibold text-indigo-800 text-base flex-1 mr-2">{program.title}</Text>
                <Text className="text-indigo-500 text-sm mr-2">{done}/{total}</Text>
                <Text className="text-indigo-400 text-sm">{expanded ? '▲' : '▼'}</Text>
              </View>
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
            </Pressable>

            {expanded && trainings.map(training => (
              <TrainingRow
                key={training.id}
                training={training}
                completing={completing === training.id}
                onComplete={() => completeTraining(training)}
              />
            ))}
          </View>
        )
      })}

      {/* Standalone trainings */}
      {standaloneTrainings.length > 0 && (
        <View className="mb-6">
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

      {totalCount === 0 && (
        <View className="items-center mt-8">
          <Text className="text-gray-400 text-center">
            No training scheduled yet.{'\n'}Head to the Training tab to enroll in a program.
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

function TrainingRow({
  training,
  completing,
  onComplete,
}: {
  training: TrainingWithCompletion
  completing: boolean
  onComplete: () => void
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
      </View>
      <Text className="text-xs font-medium text-amber-600 ml-2 mt-1">
        +{training.xp_reward} XP
      </Text>
    </Pressable>
  )
}
