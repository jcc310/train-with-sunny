import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="dogs" options={{ title: 'Dogs' }} />
      <Tabs.Screen name="habits" options={{ title: 'Habits' }} />
    </Tabs>
  )
}
