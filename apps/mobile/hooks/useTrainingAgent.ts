import { useState } from 'react'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { Dog } from '@train-with-sunny/shared'

export type AgentMessage = { role: 'user' | 'assistant'; content: string }

export function useTrainingAgent(dog?: Dog | null) {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendMessage(userText: string) {
    const newMessages: AgentMessage[] = [
      ...messages,
      { role: 'user', content: userText },
    ]
    setMessages(newMessages)
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const dogProfile = dog
        ? {
            id:        dog.id,
            name:      dog.name,
            breed:     dog.breed ?? undefined,
            birthday:  dog.birthday ?? undefined,
          }
        : undefined

      const { data, error: fnError } = await supabase.functions.invoke('training-agent', {
        body: {
          messages:   newMessages,
          dogProfile,
          userId:     user?.id,
          dogId:      dog?.id,
        },
      })

      if (fnError) throw fnError

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])

      if (data.savedProgramId) {
        router.push(`/program-preview/${data.savedProgramId}`)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function clearMessages() {
    setMessages([])
  }

  return { messages, sendMessage, loading, error, clearMessages }
}
