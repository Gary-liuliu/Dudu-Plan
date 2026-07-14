import { StatusBar } from 'expo-status-bar';
import { Dumbbell } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabs } from './src/components/BottomTabs';
import { HomeScreen } from './src/screens/HomeScreen';
import { NutritionScreen } from './src/screens/NutritionScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { WorkoutScreen } from './src/screens/WorkoutScreen';
import { rescheduleWorkoutReminders } from './src/services/notifications';
import { AppStoreProvider, useAppStore } from './src/state/AppStore';
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
  const [activeTab, setActiveTab] = useState<AppTab>('home');

  useEffect(() => {
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
    hydrated,
  ]);

  if (!hydrated) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        {activeTab === 'home' ? <HomeScreen onNavigate={setActiveTab} /> : null}
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
      <AppStoreProvider>
        <AppShell />
      </AppStoreProvider>
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
