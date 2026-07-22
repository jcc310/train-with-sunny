import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'

interface ScheduledItem {
  scheduleId: string
  habitId: string
  title: string
  description: string | null
  scheduledDate: string
  status: 'scheduled' | 'completed' | 'overdue' | 'skipped'
  durationMins: number | null
  xpReward: number
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d
}

export default function CalendarScreen() {
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState(dateString(today))
  const [weekStart, setWeekStart] = useState(startOfWeek(today))
  const [items, setItems] = useState<ScheduledItem[]>([])
  const [dogId, setDogId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [rescheduleTarget, setRescheduleTarget] = useState<ScheduledItem | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')

  const loadItems = useCallback(async (date: string, dog: string) => {
    const { data } = await supabase
      .from('habit_schedule')
      .select('id, habit_id, scheduled_date, status, habits(title, description, xp_reward)')
      .eq('dog_id', dog)
      .eq('scheduled_date', date)
      .order('created_at')

    setItems(
      (data ?? []).map((row: any) => ({
        scheduleId: row.id,
        habitId: row.habit_id,
        title: row.habits?.title ?? '',
        description: row.habits?.description ?? null,
        scheduledDate: row.scheduled_date,
        status: row.status,
        durationMins: null,
        xpReward: row.habits?.xp_reward ?? 10,
      }))
    )
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      async function init() {
        setLoading(true)
        const { data: dog } = await supabase.from('dogs').select('id').limit(1).single()
        if (dog) {
          setDogId(dog.id)
          await loadItems(selectedDate, dog.id)
        } else {
          setLoading(false)
        }
      }
      init()
    }, [])
  )

  const selectDate = async (date: string) => {
    setSelectedDate(date)
    if (dogId) {
      setLoading(true)
      await loadItems(date, dogId)
    }
  }

  const markComplete = async (item: ScheduledItem) => {
    if (!dogId || item.status === 'completed') return

    await supabase
      .from('habit_schedule')
      .update({ status: 'completed' })
      .eq('id', item.scheduleId)

    await supabase.from('habit_completions').insert({
      habit_id: item.habitId,
      dog_id: dogId,
      schedule_id: item.scheduleId,
    })

    const { data: dog } = await supabase.from('dogs').select('xp, level').eq('id', dogId).single()
    if (dog) {
      const newXp = dog.xp + item.xpReward
      const newLevel = Math.floor(newXp / 100) + 1
      await supabase.from('dogs').update({ xp: newXp, level: newLevel }).eq('id', dogId)
    }

    setItems(prev =>
      prev.map(i => i.scheduleId === item.scheduleId ? { ...i, status: 'completed' } : i)
    )
  }

  const confirmReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !dogId) return

    await supabase
      .from('habit_schedule')
      .update({
        scheduled_date: rescheduleDate,
        rescheduled_from: rescheduleTarget.scheduledDate,
        status: 'scheduled',
      })
      .eq('id', rescheduleTarget.scheduleId)

    setRescheduleTarget(null)
    setRescheduleDate('')
    await loadItems(selectedDate, dogId)
  }

  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 pt-14 pb-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Calendar</Text>
        <Text className="text-gray-400 text-sm mt-0.5">
          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {/* Week strip */}
      <View className="bg-white border-b border-gray-100 px-2 py-3">
        <View className="flex-row justify-between items-center mb-2 px-2">
          <Pressable
            onPress={() => setWeekStart(addDays(weekStart, -7))}
            className="px-3 py-1 active:opacity-60"
          >
            <Text className="text-indigo-500 font-semibold">‹</Text>
          </Pressable>
          <Text className="text-gray-500 text-xs">
            {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {addDays(weekStart, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
          <Pressable
            onPress={() => setWeekStart(addDays(weekStart, 7))}
            className="px-3 py-1 active:opacity-60"
          >
            <Text className="text-indigo-500 font-semibold">›</Text>
          </Pressable>
        </View>

        <View className="flex-row justify-around">
          {week.map(day => {
            const ds = dateString(day)
            const isSelected = ds === selectedDate
            const isToday = ds === dateString(today)
            return (
              <Pressable
                key={ds}
                onPress={() => selectDate(ds)}
                className="items-center"
              >
                <Text className="text-xs text-gray-400 mb-1">{DAY_LABELS[day.getDay()]}</Text>
                <View className={[
                  'w-9 h-9 rounded-full items-center justify-center',
                  isSelected ? 'bg-indigo-500' : isToday ? 'bg-indigo-50' : '',
                ].join(' ')}>
                  <Text className={[
                    'text-sm font-semibold',
                    isSelected ? 'text-white' : isToday ? 'text-indigo-500' : 'text-gray-700',
                  ].join(' ')}>
                    {day.getDate()}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Sessions for selected day */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
        >
          <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>

          {items.length === 0 && (
            <View className="items-center mt-12">
              <Text className="text-gray-300 text-4xl mb-3">📅</Text>
              <Text className="text-gray-400 text-center">No sessions scheduled for this day.</Text>
            </View>
          )}

          {items.map(item => (
            <View
              key={item.scheduleId}
              className={[
                'rounded-2xl p-4 mb-3 border',
                item.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200',
              ].join(' ')}
            >
              <View className="flex-row items-start">
                <Pressable
                  onPress={() => markComplete(item)}
                  disabled={item.status === 'completed'}
                  className={[
                    'w-6 h-6 rounded-full border-2 mr-3 mt-0.5 items-center justify-center flex-shrink-0',
                    item.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-gray-300',
                  ].join(' ')}
                >
                  {item.status === 'completed' && (
                    <Text className="text-white text-xs font-bold">✓</Text>
                  )}
                </Pressable>

                <View className="flex-1">
                  <Text className={[
                    'font-semibold text-base',
                    item.status === 'completed' ? 'text-green-700' : 'text-gray-800',
                  ].join(' ')}>
                    {item.title}
                  </Text>
                  {item.description && (
                    <Text className="text-gray-500 text-sm mt-0.5">{item.description}</Text>
                  )}
                  <Text className="text-amber-600 text-xs font-medium mt-1">+{item.xpReward} XP</Text>
                </View>

                {item.status !== 'completed' && (
                  <Pressable
                    onPress={() => {
                      setRescheduleTarget(item)
                      setRescheduleDate('')
                    }}
                    className="ml-2 mt-0.5 active:opacity-60"
                  >
                    <Text className="text-gray-400 text-xs">Move</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Reschedule modal */}
      <Modal visible={!!rescheduleTarget} transparent animationType="fade">
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full">
            <Text className="text-lg font-bold text-gray-900 mb-1">Move session</Text>
            <Text className="text-gray-500 text-sm mb-4">
              Enter a new date for "{rescheduleTarget?.title}"
            </Text>
            <Text className="text-gray-600 text-sm font-medium mb-1">New date (YYYY-MM-DD)</Text>
            <View className="border border-gray-200 rounded-xl px-4 py-3 mb-4">
              <Text
                className="text-gray-800"
                onPress={() => {/* date picker could go here */}}
              >
                {rescheduleDate || 'e.g. ' + dateString(addDays(today, 1))}
              </Text>
            </View>
            <View className="flex-row gap-3">
              {[1, 2, 3, 7].map(n => (
                <Pressable
                  key={n}
                  onPress={() => setRescheduleDate(dateString(addDays(today, n)))}
                  className={[
                    'flex-1 rounded-xl py-2 items-center border',
                    rescheduleDate === dateString(addDays(today, n))
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'bg-gray-50 border-gray-200',
                  ].join(' ')}
                >
                  <Text className={rescheduleDate === dateString(addDays(today, n)) ? 'text-white text-xs font-medium' : 'text-gray-600 text-xs'}>
                    +{n}d
                  </Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row gap-3 mt-4">
              <Pressable
                onPress={() => setRescheduleTarget(null)}
                className="flex-1 border border-gray-200 rounded-xl py-3 items-center"
              >
                <Text className="text-gray-600 font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmReschedule}
                disabled={!rescheduleDate}
                className="flex-1 bg-indigo-500 rounded-xl py-3 items-center"
              >
                <Text className="text-white font-medium">Move</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
