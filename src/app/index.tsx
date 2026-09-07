import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { assertConfig } from '@/lib/config';

const PACKS = ['A', 'B', 'C'] as const;

/**
 * Voice PoC 진입 화면.
 * 라이더 이름 + Ride 코드 + Pack 선택 → Pack Voice 참가.
 * (Club/Ride 관리는 MVP v0.2에서 Supabase 기반으로 확장)
 */
export default function HomeScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [rideCode, setRideCode] = useState('');
  const [pack, setPack] = useState<(typeof PACKS)[number]>('A');

  useEffect(() => {
    AsyncStorage.multiGet(['rider-name', 'ride-code']).then((entries) => {
      const saved = Object.fromEntries(entries);
      if (saved['rider-name']) setName(saved['rider-name']);
      if (saved['ride-code']) setRideCode(saved['ride-code']);
    });
  }, []);

  const join = () => {
    const configError = assertConfig();
    if (configError) {
      Alert.alert('설정 필요', configError);
      return;
    }
    const trimmedName = name.trim();
    const trimmedCode = rideCode.trim().toUpperCase();
    if (!trimmedName || !trimmedCode) {
      Alert.alert('입력 필요', '이름과 Ride 코드를 입력하세요.');
      return;
    }
    AsyncStorage.multiSet([
      ['rider-name', trimmedName],
      ['ride-code', trimmedCode],
    ]);
    router.push({
      pathname: '/room',
      params: { name: trimmedName, ride: trimmedCode, pack },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}>
          <ThemedText type="title" style={styles.slogan}>
            Stay connected.{'\n'}Ride together.
          </ThemedText>

          <ThemedText type="smallBold">라이더 이름</ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="예: 승의"
            placeholderTextColor="#888"
            autoCapitalize="none"
          />

          <ThemedText type="smallBold">Ride 코드</ThemedText>
          <TextInput
            style={styles.input}
            value={rideCode}
            onChangeText={setRideCode}
            placeholder="예: SUNDAY (같은 코드 = 같은 Ride)"
            placeholderTextColor="#888"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <ThemedText type="smallBold">Pack</ThemedText>
          <ThemedView style={styles.packRow}>
            {PACKS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setPack(p)}
                style={[styles.packButton, pack === p && styles.packButtonActive]}>
                <ThemedText
                  type="smallBold"
                  style={pack === p ? styles.packLabelActive : undefined}>
                  Pack {p}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>

          <Pressable style={styles.joinButton} onPress={join}>
            <ThemedText type="subtitle" style={styles.joinLabel}>
              Pack Voice 참가
            </ThemedText>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  form: { flex: 1, padding: 24, gap: 10, justifyContent: 'center' },
  slogan: { marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#8884',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#208AEF',
    marginBottom: 8,
  },
  packRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  packButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#8884',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  packButtonActive: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  packLabelActive: { color: '#fff' },
  joinButton: {
    backgroundColor: '#208AEF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  joinLabel: { color: '#fff' },
});
