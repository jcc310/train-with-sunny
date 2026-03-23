import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [hasDog, setHasDog] = useState<boolean | null>(null)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setInitialized(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setHasDog(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!initialized || !session) return
    setHasDog(null)
    supabase
      .from('dogs')
      .select('id')
      .limit(1)
      .then(({ data }) => setHasDog(!!data && data.length > 0))
  }, [initialized, session, segments[0]])

  useEffect(() => {
    if (!initialized) return
    if (hasDog === null && session) return // still loading dog check

    const inAuthGroup = segments[0] === '(auth)'
    const inDogSetup = segments[0] === 'dog-setup'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && !hasDog && !inDogSetup) {
      router.replace('/dog-setup')
    } else if (session && hasDog && (inAuthGroup || inDogSetup)) {
      router.replace('/(tabs)')
    }
  }, [session, initialized, hasDog, segments])

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="dog-setup" options={{ headerShown: false }} />
    </Stack>
  )
}
