import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { Category } from '@train-with-sunny/shared'

const CATEGORY_META: Record<string, { emoji: string; color: string; textColor: string; borderColor: string }> = {
  obedience: { emoji: '🎓', color: 'bg-indigo-50',  textColor: 'text-indigo-800', borderColor: 'border-indigo-100' },
  tricks:    { emoji: '⭐', color: 'bg-amber-50',   textColor: 'text-amber-800',  borderColor: 'border-amber-100'  },
}

export default function CatalogScreen() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('categories')
        .select('*')
        .order('order_index')
        .then(({ data }) => {
          setCategories(data ?? [])
          setLoading(false)
        })
    }, [])
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

      <Text className="text-3xl font-bold text-gray-900 mb-1">Catalog</Text>
      <Text className="text-gray-500 mb-8">Browse courses and enroll your dog</Text>

      {categories.map(cat => {
        const meta = CATEGORY_META[cat.slug] ?? { emoji: '📚', color: 'bg-gray-50', textColor: 'text-gray-800', borderColor: 'border-gray-200' }
        return (
          <Pressable
            key={cat.id}
            onPress={() => router.push(`/catalog/${cat.slug}`)}
            className={`${meta.color} border ${meta.borderColor} rounded-2xl p-6 mb-4 active:opacity-80`}
          >
            <Text className="text-4xl mb-3">{meta.emoji}</Text>
            <Text className={`text-xl font-bold mb-1 ${meta.textColor}`}>{cat.name}</Text>
            {cat.description && (
              <Text className="text-gray-500 text-sm leading-5">{cat.description}</Text>
            )}
            <Text className={`mt-3 text-sm font-semibold ${meta.textColor}`}>Browse courses →</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
