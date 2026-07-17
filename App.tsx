import { StatusBar } from 'expo-status-bar';
import { Dumbbell } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabs } from './src/components/BottomTabs';
import { ChatScreen } from './src/screens/ChatScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { NutritionScreen } from './src/screens/NutritionScreen';
import { ObserverScreen } from './src/screens/ObserverScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { WorkoutScreen } from './src/screens/WorkoutScreen';
import {
  cancelWorkoutReminders,
  rescheduleWorkoutReminders,
} from './src/services/notifications';
import { AccountStoreProvider, useAccountStore } from './src/state/AccountStore';
import { AppStoreProvider, useAppStore } from './src/state/AppStore';
import { ChatStoreProvider, useChatStore } from './src/state/ChatStore';
import { RealtimeStoreProvider, useRealtimeStore } from './src/state/RealtimeStore';
import { colors } from './src/theme';
import type { AppTab } from './src/types';

function LoadingScreen() {
  return (
    <View style={styles.loadingRoot}>
      <View style={styles.loadingMark}>
        <Dumbbell color={colors.white} size={32} strokeWidth={2.5} />
      </View>
      <Text style={styles.loadingTitle}>嘟嘟计划</Text>
      <ActivityIndicator color={colors.coral} size="small" style={styles.loadingSpinner} />
    </View>
  );
}

// [Function] 协调页面导航、数据加载与本地通知重排。[Warning] 通知失败不能阻断本地记录。
function AppShell() {
  const { data, hydrated } = useAppStore();
  const account = useAccountStore();
  const realtime = useRealtimeStore();
  const chat = useChatStore();
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!account.hydrated) {
      return;
    }

    if (account.session?.role !== 'owner') {
      void cancelWorkoutReminders().catch(() => undefined);
      return;
    }

    if (!hydrated) {
      return;
    }

    void rescheduleWorkoutReminders(
      data.profile.reminderEnabled,
      data.profile.workoutHour,
      data.profile.workoutMinute,
    ).catch(() => undefined);
  }, [
    data.profile.reminderEnabled,
    data.profile.workoutHour,
    data.profile.workoutMinute,
    account.hydrated,
    hydrated,
    account.session?.role,
  ]);

  if (!account.hydrated || (account.session?.role === 'owner' && !hydrated)) {
    return <LoadingScreen />;
  }

  if (!account.session) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen error={account.error} loading={account.loading} onLogin={account.login} />
      </>
    );
  }

  if (chatOpen) {
    return <ChatScreen onClose={() => setChatOpen(false)} />;
  }

  if (account.session.role === 'observer') {
    return (
      <>
        <StatusBar style="dark" />
        <ObserverScreen
          connectionState={realtime.connectionState}
          lastSyncedAt={realtime.lastSyncedAt}
          ownerConnected={realtime.ownerConnected}
          onOpenChat={() => setChatOpen(true)}
          onLogout={() => {
            void account.logout()
              .catch(() => {
                Alert.alert('退出失败', '无法清除本机登录状态，请稍后重试。');
              });
          }}
          sessions={realtime.observerSessions}
          unreadCount={chat.unreadCount}
        />
      </>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        {activeTab === 'home' ? (
          <HomeScreen
            onNavigate={setActiveTab}
            onOpenChat={() => setChatOpen(true)}
            unreadCount={chat.unreadCount}
          />
        ) : null}
        {activeTab === 'workout' ? <WorkoutScreen /> : null}
        {activeTab === 'nutrition' ? <NutritionScreen /> : null}
        {activeTab === 'progress' ? <ProgressScreen /> : null}
      </View>
      <BottomTabs activeTab={activeTab} onChange={setActiveTab} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AccountStoreProvider>
        <AppStoreProvider>
          <RealtimeStoreProvider>
            <ChatStoreProvider>
              <AppShell />
            </ChatStoreProvider>
          </RealtimeStoreProvider>
        </AppStoreProvider>
      </AccountStoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingMark: {
    height: 70,
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.coral,
  },
  loadingTitle: {
    marginTop: 18,
    color: colors.ink,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 0,
  },
  loadingSpinner: {
    marginTop: 16,
  },
});
