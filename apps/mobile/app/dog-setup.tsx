import { useState } from 'react'
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'

const BREEDS = [
  'Labrador Retriever', 'Golden Retriever', 'French Bulldog', 'German Shepherd',
  'Bulldog', 'Poodle', 'Beagle', 'Rottweiler', 'Yorkshire Terrier', 'Dachshund',
  'Boxer', 'Siberian Husky', 'Shih Tzu', 'Doberman', 'Chihuahua', 'Border Collie',
  'Australian Shepherd', 'Pomeranian', 'Maltese', 'Corgi', 'Great Dane',
  'Cocker Spaniel', 'Schnauzer', 'Pit Bull', 'Bernese Mountain Dog', 'Shiba Inu',
  'Cavapoo', 'Goldendoodle', 'Labradoodle', 'Mixed / Other',
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 21 }, (_, i) => String(currentYear - i))

type DropdownProps = {
  label: string
  value: string
  options: string[]
  onSelect: (val: string) => void
}

function Dropdown({ label, value, options, onSelect }: DropdownProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TouchableOpacity
        className="border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center bg-white"
        onPress={() => setOpen(true)}
      >
        <Text className={value ? 'text-gray-900 text-base' : 'text-gray-400 text-base'}>
          {value || label}
        </Text>
        <Text className="text-gray-400">▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl max-h-96">
            <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100">
              <Text className="font-semibold text-gray-800 text-base">{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text className="text-blue-500 font-medium">Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt}
                  className={`px-5 py-3.5 border-b border-gray-50 ${value === opt ? 'bg-blue-50' : ''}`}
                  onPress={() => { onSelect(opt); setOpen(false) }}
                >
                  <Text className={`text-base ${value === opt ? 'text-blue-500 font-semibold' : 'text-gray-800'}`}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}

export default function DogSetupScreen() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [breedSearch, setBreedSearch] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [saving, setSaving] = useState(false)

  const filteredBreeds = BREEDS.filter(b =>
    b.toLowerCase().includes(breedSearch.toLowerCase())
  )

  async function handleFinish() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Ensure profile exists before inserting dog (required by RLS policy)
    await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id' })

    const monthIndex = MONTHS.indexOf(birthMonth) + 1
    const birthday = `${birthYear}-${String(monthIndex).padStart(2, '0')}-01`

    const { error } = await supabase.from('dogs').insert({
      owner_id: user.id,
      name,
      breed: breed || null,
      birthday,
    })

    if (error) {
      Alert.alert('Error', error.message)
      setSaving(false)
      return
    }

    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Progress bar + back button */}
      <View className="px-6 pt-4 pb-6">
        {step > 1 && (
          <TouchableOpacity onPress={() => setStep(step - 1)} className="mb-4">
            <Text className="text-blue-500 font-medium text-base">← Back</Text>
          </TouchableOpacity>
        )}
        <View className="flex-row gap-2">
          {[1, 2, 3].map(s => (
            <View
              key={s}
              className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-blue-500' : 'bg-gray-200'}`}
            />
          ))}
        </View>
      </View>

      {/* Step 1 — Name */}
      {step === 1 && (
        <View className="flex-1 px-6 justify-center">
          <Text className="text-3xl font-bold mb-2">What's your dog's name?</Text>
          <Text className="text-gray-500 mb-8">Let's get started with the basics.</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-lg mb-8"
            placeholder="e.g. Sunny"
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <TouchableOpacity
            className={`rounded-lg py-3 items-center ${name.trim() ? 'bg-blue-500' : 'bg-gray-200'}`}
            onPress={() => setStep(2)}
            disabled={!name.trim()}
          >
            <Text className={`font-semibold text-base ${name.trim() ? 'text-white' : 'text-gray-400'}`}>
              Next
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2 — Breed */}
      {step === 2 && (
        <View className="flex-1 px-6">
          <Text className="text-3xl font-bold mb-2">What breed is {name}?</Text>
          <Text className="text-gray-500 mb-4">Search or scroll to find their breed.</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
            placeholder="Search breeds..."
            value={breedSearch}
            onChangeText={setBreedSearch}
          />
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {filteredBreeds.map(b => (
              <TouchableOpacity
                key={b}
                className={`py-3.5 px-4 rounded-lg mb-2 ${breed === b ? 'bg-blue-500' : 'bg-gray-100'}`}
                onPress={() => { setBreed(b); setStep(3) }}
              >
                <Text className={`font-medium ${breed === b ? 'text-white' : 'text-gray-800'}`}>
                  {b}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Step 3 — Birthday */}
      {step === 3 && (
        <View className="flex-1 px-6 justify-center">
          <Text className="text-3xl font-bold mb-2">When was {name} born?</Text>
          <Text className="text-gray-500 mb-8">Pick their birth month and year.</Text>

          <Text className="font-semibold text-gray-700 mb-2">Month</Text>
          <Dropdown
            label="Select month"
            value={birthMonth}
            options={MONTHS}
            onSelect={setBirthMonth}
          />

          <Text className="font-semibold text-gray-700 mt-5 mb-2">Year</Text>
          <Dropdown
            label="Select year"
            value={birthYear}
            options={YEARS}
            onSelect={setBirthYear}
          />

          <TouchableOpacity
            className={`rounded-lg py-3 items-center mt-8 ${birthMonth && birthYear ? 'bg-blue-500' : 'bg-gray-200'}`}
            onPress={handleFinish}
            disabled={!birthMonth || !birthYear || saving}
          >
            <Text className={`font-semibold text-base ${birthMonth && birthYear ? 'text-white' : 'text-gray-400'}`}>
              {saving ? 'Saving...' : 'Finish'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}
