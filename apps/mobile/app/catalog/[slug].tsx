import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { Category, Course } from '@train-with-sunny/shared'

const LEVEL_COLOR: Record<string, string> = {
  beginner:     'bg-green-100 text-green-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced:     'bg-red-100 text-red-700',
}

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [category, setCategory] = useState<Category | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', slug)
          .single()

        if (!catData) { setLoading(false); return }
        setCategory(catData)

        const [coursesRes, dogRes] = await Promise.all([
          supabase
            .from('courses')
            .select('*')
            .eq('category_id', catData.id)
            .order('order_index'),
          supabase.from('dogs').select('id').limit(1).single(),
        ])

        setCourses(coursesRes.data ?? [])

        if (dogRes.data) {
          const { data: enrollments } = await supabase
            .from('dog_course_enrollments')
            .select('course_id')
            .eq('dog_id', dogRes.data.id)
          setEnrolledCourseIds(new Set((enrollments ?? []).map((e: { course_id: string }) => e.course_id)))
        }

        setLoading(false)
      }
      load()
    }, [slug])
  )

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
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

      <Text className="text-3xl font-bold text-gray-900 mb-1">{category?.name}</Text>
      <Text className="text-gray-500 mb-8">{courses.length} course{courses.length !== 1 ? 's' : ''}</Text>

      {courses.map(course => {
        const enrolled = enrolledCourseIds.has(course.id)
        const levelStyle = LEVEL_COLOR[course.skill_level] ?? 'bg-gray-100 text-gray-700'
        return (
          <Pressable
            key={course.id}
            onPress={() => router.push(`/catalog/course/${course.id}`)}
            className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 active:opacity-80"
          >
            <View className="flex-row items-start justify-between mb-2">
              <Text className="text-lg font-bold text-gray-900 flex-1 mr-3">{course.title}</Text>
              {enrolled && (
                <View className="bg-green-100 px-2.5 py-1 rounded-full">
                  <Text className="text-green-700 text-xs font-semibold">Enrolled</Text>
                </View>
              )}
            </View>
            {course.description && (
              <Text className="text-gray-500 text-sm leading-5 mb-3">{course.description}</Text>
            )}
            <View className={`self-start px-3 py-1 rounded-full ${levelStyle}`}>
              <Text className="text-xs font-semibold capitalize">{course.skill_level}</Text>
            </View>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
