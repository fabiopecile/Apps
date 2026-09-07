import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/lib/i18n';
import { colors, fonts } from '@/theme';

export default function TabsLayout() {
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.neon,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="camera"
        options={{
          title: t('tab.camera'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="camera" color={String(color)} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="arcade"
        options={{
          title: t('tab.arcade'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="game-controller" color={String(color)} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)} size={22} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.backgroundElevated,
    borderTopColor: colors.borderFaint,
    borderTopWidth: 1,
    height: 78,
    paddingTop: 8,
  },
  tabItem: {
    paddingTop: 2,
  },
  tabLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  iconWrap: {
    width: 40,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.neonFaint,
  },
});
