import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { CatalogProgram, DogProgramProgress, ProgramPhase } from '@train-with-sunny/shared'

function addDays(date: Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const XP_PER_LEVEL = 100

export default function SkillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [program, setProgram] = useState<CatalogProgram | null>(null)
  const [phases, setPhases] = useState<ProgramPhase[]>([])
  const [progress, setProgress] = useState<DogProgramProgress | null>(null)
  const [dogId, setDogId] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [progRes, phasesRes, dogRes] = await Promise.all([
          supabase.from('catalog_programs').select('*').eq('id', id).single(),
          supabase.from('program_phases').select('*').eq('program_id', id).order('phase_number'),
          supabase.from('dogs').select('id').limit(1).single(),
        ])

        setProgram(progRes.data)
        setPhases(phasesRes.data ?? [])

        if (dogRes.data) {
          setDogId(dogRes.data.id)
          const { data: p } = await supabase
            .from('dog_program_progress')
            .select('*')
            .eq('dog_id', dogRes.data.id)
            .eq('program_id', id)
            .maybeSingle()
          setProgress(p)
        }

        setLoading(false)
      }
      load()
    }, [id])
  )

  const currentPhase = phases.find(p => p.phase_number === (progress?.current_phase ?? 1))
  const isLastPhase = (progress?.current_phase ?? 1) >= phases.length
  const isCompleted = !!progress?.completed_at

  const markPhaseComplete = async () => {
    if (!dogId || !program || !progress || completing) return
    setCompleting(true)

    const xpGain = program.xp_phase_complete + (isLastPhase ? program.xp_program_complete : 0)

    if (isLastPhase) {
      // Mark the entire program complete
      await supabase
        .from('dog_program_progress')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', progress.id)
    } else {
      const nextPhase = progress.current_phase + 1
      const nextPhaseData = phases.find(p => p.phase_number === nextPhase)

      // Advance phase
      await supabase
        .from('dog_program_progress')
        .update({ current_phase: nextPhase })
        .eq('id', progress.id)

      // Update the habit to reflect the new phase description
      if (nextPhaseData) {
        const { data: habitData } = await supabase
          .from('habits')
          .select('id')
          .eq('dog_id', dogId)
          .eq('catalog_program_id', program.id)
          .maybeSingle()

        if (habitData) {
          await supabase
            .from('habits')
            .update({
              description: nextPhaseData.title,
              phase_number: nextPhase,
            })
            .eq('id', habitData.id)

          // Create habit_schedule rows for next phase
          const today = new Date()
          const scheduleRows = Array.from({ length: nextPhaseData.duration_days }, (_, i) => ({
            habit_id: habitData.id,
            dog_id: dogId,
            scheduled_date: addDays(today, i),
            status: 'scheduled',
          }))
          await supabase.from('habit_schedule').insert(scheduleRows)
        }
      }
    }

    // Award XP
    const { data: dogData } = await supabase.from('dogs').select('xp').eq('id', dogId).single()
    if (dogData) {
      const newXp = dogData.xp + xpGain
      const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1
      await supabase.from('dogs').update({ xp: newXp, level: newLevel }).eq('id', dogId)
    }

    setCompleting(false)

    const message = isLastPhase
      ? `You've completed ${program.title}! +${xpGain} XP earned.`
      : `Phase ${progress.current_phase} complete! Moving to Phase ${progress.current_phase + 1}. +${xpGain} XP earned.`

    Alert.alert('Great work!', message, [{ text: 'OK', onPress: () => router.back() }])
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
        <Text className="text-gray-500">Skill not found.</Text>
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 }}
    >
      <Pressable onPress={() => router.back()} className="mb-4 active:opacity-60">
        <Text className="text-indigo-500 text-base">← Back</Text>
      </Pressable>

      <Text className="text-3xl font-bold text-gray-900 mb-1">{program.title}</Text>

      {/* Phase progress bar */}
      {phases.length > 0 && (
        <View className="mt-3 mb-6">
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-500 text-sm">
              {isCompleted ? 'Completed!' : `Phase ${progress?.current_phase ?? 1} of ${phases.length}`}
            </Text>
            <Text className="text-amber-600 text-sm font-medium">
              +{program.xp_program_complete} XP total
            </Text>
          </View>
          <View className="bg-gray-200 rounded-full h-2">
            <View
              className="bg-indigo-500 h-2 rounded-full"
              style={{
                width: isCompleted
                  ? '100%'
                  : `${((progress?.current_phase ?? 1) - 1) / phases.length * 100}%`
              }}
            />
          </View>
        </View>
      )}

      {/* Current phase card */}
      {currentPhase && !isCompleted && (
        <View className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-6">
          <View className="flex-row items-center mb-3">
            <View className="bg-indigo-500 w-6 h-6 rounded-full items-center justify-center mr-2">
              <Text className="text-white text-xs font-bold">{currentPhase.phase_number}</Text>
            </View>
            <Text className="font-semibold text-indigo-800 text-base flex-1">{currentPhase.title}</Text>
          </View>
          {currentPhase.instructions && (
            <Text className="text-gray-700 text-sm leading-6">{currentPhase.instructions}</Text>
          )}
          {currentPhase.success_criteria && (
            <View className="mt-4 bg-white rounded-xl p-3 border border-indigo-100">
              <Text className="text-xs font-semibold text-indigo-600 mb-1">SUCCESS CRITERIA</Text>
              <Text className="text-gray-700 text-sm">{currentPhase.success_criteria}</Text>
            </View>
          )}
          <Text className="text-gray-400 text-xs mt-3">
            {currentPhase.duration_days} day{currentPhase.duration_days !== 1 ? 's' : ''} · +{program.xp_phase_complete} XP on completion
          </Text>
        </View>
      )}

      {isCompleted && (
        <View className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 items-center">
          <Text className="text-3xl mb-2">🎉</Text>
          <Text className="font-semibold text-green-800 text-base">Program complete!</Text>
          <Text className="text-green-600 text-sm mt-1">
            You've worked through all {phases.length} phases of {program.title}.
          </Text>
        </View>
      )}

      {/* All phases list */}
      <Text className="text-base font-semibold text-gray-800 mb-3">All phases</Text>
      {phases.map(phase => {
        const currentPhaseNum = progress?.current_phase ?? 1
        const isDone = isCompleted || phase.phase_number < currentPhaseNum
        const isCurrent = !isCompleted && phase.phase_number === currentPhaseNum
        return (
          <View
            key={phase.id}
            className={[
              'rounded-xl p-4 mb-2 border',
              isCurrent ? 'bg-indigo-50 border-indigo-200' : isDone ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100',
            ].join(' ')}
          >
            <View className="flex-row items-center">
              <Text className="text-base mr-2">{isDone ? '✅' : isCurrent ? '▶️' : '⏳'}</Text>
              <Text className={[
                'font-medium flex-1',
                isCurrent ? 'text-indigo-800' : isDone ? 'text-green-700' : 'text-gray-400',
              ].join(' ')}>
                Phase {phase.phase_number}: {phase.title}
              </Text>
              <Text className="text-xs text-gray-400">{phase.duration_days}d</Text>
            </View>
          </View>
        )
      })}

      {/* Mark phase complete */}
      {progress && !isCompleted && (
        <Pressable
          onPress={markPhaseComplete}
          disabled={completing}
          className="mt-6 bg-indigo-500 rounded-2xl py-4 items-center active:opacity-80"
        >
          <Text className="text-white font-semibold text-base">
            {completing
              ? 'Saving...'
              : isLastPhase
                ? `Complete ${program.title} 🎉`
                : `Mark Phase ${progress.current_phase} Complete`
            }
          </Text>
        </Pressable>
      )}
    </ScrollView>
  )
}
