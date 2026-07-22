import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { CatalogProgram, Course, DogProgramProgress, ProgramPhase, ProgramPrerequisite } from '@train-with-sunny/shared'

function addDays(date: Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [course, setCourse] = useState<Course | null>(null)
  const [programs, setPrograms] = useState<CatalogProgram[]>([])
  const [phases, setPhases] = useState<Record<string, ProgramPhase[]>>({})
  const [prerequisites, setPrerequisites] = useState<ProgramPrerequisite[]>([])
  const [progress, setProgress] = useState<DogProgramProgress[]>([])
  const [dogId, setDogId] = useState<string | null>(null)
  const [enrolled, setEnrolled] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [courseRes, dogRes] = await Promise.all([
          supabase.from('courses').select('*').eq('id', id).single(),
          supabase.from('dogs').select('id').limit(1).single(),
        ])

        setCourse(courseRes.data)

        const [programsRes, prereqRes] = await Promise.all([
          supabase.from('catalog_programs').select('*').eq('course_id', id).order('order_index'),
          supabase.from('program_prerequisites').select('*'),
        ])

        const progs: CatalogProgram[] = programsRes.data ?? []
        setPrograms(progs)
        setPrerequisites(prereqRes.data ?? [])

        if (progs.length > 0) {
          const { data: phasesData } = await supabase
            .from('program_phases')
            .select('*')
            .in('program_id', progs.map(p => p.id))
            .order('phase_number')

          const phaseMap: Record<string, ProgramPhase[]> = {}
          for (const ph of phasesData ?? []) {
            phaseMap[ph.program_id] = [...(phaseMap[ph.program_id] ?? []), ph]
          }
          setPhases(phaseMap)
        }

        if (dogRes.data) {
          setDogId(dogRes.data.id)

          const [enrollRes, progressRes] = await Promise.all([
            supabase
              .from('dog_course_enrollments')
              .select('id')
              .eq('dog_id', dogRes.data.id)
              .eq('course_id', id)
              .maybeSingle(),
            supabase
              .from('dog_program_progress')
              .select('*')
              .eq('dog_id', dogRes.data.id),
          ])

          setEnrolled(!!enrollRes.data)
          setProgress(progressRes.data ?? [])
        }

        setLoading(false)
      }
      load()
    }, [id])
  )

  const enroll = async () => {
    if (!dogId || !course || enrolling) return
    setEnrolling(true)

    // 1. Insert enrollment
    const { error: enrollError } = await supabase
      .from('dog_course_enrollments')
      .insert({ dog_id: dogId, course_id: course.id })

    if (enrollError) {
      Alert.alert('Error', enrollError.message)
      setEnrolling(false)
      return
    }

    // 2. For each program: insert progress + habit + habit_schedule (phase 1 only)
    let dayOffset = 0
    const today = new Date()

    for (const prog of programs) {
      const phase1 = phases[prog.id]?.[0]
      if (!phase1) continue

      // Insert progress row
      await supabase.from('dog_program_progress').insert({
        dog_id: dogId,
        program_id: prog.id,
        current_phase: 1,
      })

      // Insert habit row
      const { data: habitData } = await supabase
        .from('habits')
        .insert({
          dog_id: dogId,
          title: prog.title,
          description: phase1.title,
          frequency: 'daily',
          xp_reward: prog.xp_per_session,
          catalog_program_id: prog.id,
          phase_number: 1,
          source: 'catalog',
        })
        .select('id')
        .single()

      if (!habitData) continue

      // Insert habit_schedule rows for phase 1 duration
      const scheduleRows = Array.from({ length: phase1.duration_days }, (_, i) => ({
        habit_id: habitData.id,
        dog_id: dogId,
        scheduled_date: addDays(today, dayOffset + i),
        status: 'scheduled',
      }))

      await supabase.from('habit_schedule').insert(scheduleRows)
      dayOffset += phase1.duration_days
    }

    setEnrolled(true)
    setEnrolling(false)
    Alert.alert('Enrolled!', `You're now enrolled in ${course.title}. Check the Training tab to get started.`)
  }

  const isLocked = (prog: CatalogProgram): { locked: boolean; reason: string } => {
    const prereqs = prerequisites.filter(p => p.program_id === prog.id)
    for (const prereq of prereqs) {
      const p = progress.find(pr => pr.program_id === prereq.required_program_id)
      if (!p || p.current_phase < prereq.required_phase) {
        const reqProg = programs.find(pr => pr.id === prereq.required_program_id)
        return {
          locked: true,
          reason: `Requires ${reqProg?.title ?? 'a prerequisite'} Phase ${prereq.required_phase}`,
        }
      }
    }
    return { locked: false, reason: '' }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    )
  }

  if (!course) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-gray-500">Course not found.</Text>
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

      <View className="mb-2">
        <View className="bg-indigo-100 self-start px-3 py-1 rounded-full mb-3">
          <Text className="text-indigo-700 text-xs font-semibold capitalize">{course.skill_level}</Text>
        </View>
        <Text className="text-3xl font-bold text-gray-900 mb-2">{course.title}</Text>
        {course.description && (
          <Text className="text-gray-500 text-base leading-relaxed">{course.description}</Text>
        )}
      </View>

      <Text className="text-lg font-semibold text-gray-800 mt-6 mb-3">
        {programs.length} skill{programs.length !== 1 ? 's' : ''}
      </Text>

      {programs.map((prog, index) => {
        const progPhases = phases[prog.id] ?? []
        const { locked, reason } = isLocked(prog)
        const userProgress = progress.find(p => p.program_id === prog.id)

        return (
          <Pressable
            key={prog.id}
            onPress={() => !locked && router.push(`/skill/${prog.id}`)}
            disabled={locked}
            className="flex-row mb-4"
          >
            <View className="items-center mr-4">
              <View className={[
                'w-8 h-8 rounded-full items-center justify-center',
                locked ? 'bg-gray-100' : 'bg-indigo-100',
              ].join(' ')}>
                {locked
                  ? <Text className="text-gray-400 text-sm">🔒</Text>
                  : <Text className="text-indigo-600 font-bold text-sm">{index + 1}</Text>
                }
              </View>
              {index < programs.length - 1 && (
                <View className="w-0.5 flex-1 bg-gray-100 mt-1" />
              )}
            </View>

            <View className="flex-1 pb-4">
              <View className="flex-row items-start justify-between mb-1">
                <Text className={[
                  'font-semibold text-base flex-1 mr-2',
                  locked ? 'text-gray-400' : 'text-gray-800',
                ].join(' ')}>
                  {prog.title}
                </Text>
                {userProgress && !userProgress.completed_at && (
                  <View className="bg-indigo-50 px-2 py-0.5 rounded-full">
                    <Text className="text-indigo-600 text-xs font-medium">
                      Phase {userProgress.current_phase}/{progPhases.length}
                    </Text>
                  </View>
                )}
                {userProgress?.completed_at && (
                  <Text className="text-green-500 text-sm">✓</Text>
                )}
              </View>
              {locked
                ? <Text className="text-gray-400 text-xs">{reason}</Text>
                : prog.description
                  ? <Text className="text-gray-500 text-sm">{prog.description}</Text>
                  : null
              }
              {!locked && (
                <Text className="text-gray-400 text-xs mt-1">
                  {progPhases.length} phase{progPhases.length !== 1 ? 's' : ''} · +{prog.xp_program_complete} XP total
                </Text>
              )}
            </View>
          </Pressable>
        )
      })}

      {enrolled ? (
        <View className="mt-4 bg-green-50 border border-green-200 rounded-2xl py-4 items-center">
          <Text className="text-green-700 font-semibold">Already enrolled</Text>
          <Text className="text-green-600 text-sm mt-1">Check the Training tab to track your progress</Text>
        </View>
      ) : (
        <Pressable
          onPress={enroll}
          disabled={enrolling}
          className="mt-4 bg-indigo-500 rounded-2xl py-4 items-center active:opacity-80"
        >
          <Text className="text-white font-semibold text-base">
            {enrolling ? 'Enrolling...' : `Enroll in ${course.title}`}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  )
}
