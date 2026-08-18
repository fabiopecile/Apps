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
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.feed'),
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="tipps"
          options={{
            title: t('tabs.tipps'),
            tabBarIcon: ({ color, size }) => <Ionicons name="checkbox" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: t('tabs.chat'),
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="ranking"
          options={{
            title: t('tabs.ranking'),
            tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            title: t('tabs.profil'),
            tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          }}
        />
      </Tabs>
      <StreakRewardModal reward={reward} onClose={clearReward} />
    </>
  );
}
