import { StyleSheet } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyLogin } from '@/hooks/useDailyLogin';
import { useTranslation } from '@/hooks/useTranslation';
import { LoadingScreen } from '@/components/LoadingScreen';
import { StreakRewardModal } from '@/components/StreakRewardModal';
import { colors } from '@/constants/theme';

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const { reward, clearReward } = useDailyLogin();
  const { t } = useTranslation();

  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.red,
          tabBarInactiveTintColor: colors.textFaint,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: 62,
            paddingTop: 6,
            paddingBottom: 8,
          },
          tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.feed'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size - 1} />
            ),
          }}
        />
        <Tabs.Screen
          name="tipps"
          options={{
            title: t('tabs.tipps'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'checkbox' : 'checkbox-outline'} color={color} size={size - 1} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: t('tabs.chat'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} color={color} size={size - 1} />
            ),
          }}
        />
        <Tabs.Screen
          name="ranking"
          options={{
            title: t('tabs.ranking'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} color={color} size={size - 1} />
            ),
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            title: t('tabs.profil'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={size - 1} />
            ),
          }}
        />
      </Tabs>
      <StreakRewardModal reward={reward} onClose={clearReward} />
    </>
  );
}
