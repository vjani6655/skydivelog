import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, type ColorValue } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useColors } from '@/lib/theme';
import AnnouncementBanner from '@/components/ui/AnnouncementBanner';
import { useAnnouncementBanner } from '@/lib/useAnnouncementBanner';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconName) {
  return ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size} color={color as string} />
  );
}

// App canopy mark — used for the Gear tab
function CanopyIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M6 28 C 8 18, 14 14, 22 14 L 42 14 C 50 14, 56 18, 58 28 L 50 26 L 42 28 L 32 26 L 22 28 L 14 26 Z"
        fill={color}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Path
        d="M10 28 L 32 50 L 54 28"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x="29" y="48" width="6" height="10" rx="3" fill={color} />
    </Svg>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const { announcement, dismiss } = useAnnouncementBanner();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.sky,
        tabBarInactiveTintColor: colors.fg3,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontFamily: 'InterTight-Medium',
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="log"
        options={{ title: 'Log', tabBarIcon: tabIcon('journal-outline') }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Stats', tabBarIcon: tabIcon('stats-chart-outline') }}
      />
      <Tabs.Screen
        name="gear"
        options={{
          title: 'Gear',
          tabBarIcon: ({ color, size }) => <CanopyIcon color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="certificates"
        options={{ title: 'Certs', tabBarIcon: tabIcon('card-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person-circle-outline') }}
      />
      {/* Hide any auto-discovered index route from the tab bar */}
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
    {announcement && (
      <AnnouncementBanner announcement={announcement} onDismiss={dismiss} />
    )}
    </View>
  );
}
