import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function tabIcon(name: IoniconsName, outlineName: IoniconsName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? name : outlineName} size={24} color={color} />
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#f3f4f6' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: tabIcon('home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="dogs"
        options={{
          title: 'Dogs',
          tabBarIcon: tabIcon('paw', 'paw-outline'),
        }}
      />
      <Tabs.Screen
        name="trainings"
        options={{
          title: 'Training',
          tabBarIcon: tabIcon('barbell', 'barbell-outline'),
        }}
      />
    </Tabs>
  )
}
