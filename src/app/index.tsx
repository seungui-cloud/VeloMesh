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

/**
 * 홈: 이름 입력 후
 *  - 그룹 만들기 (그룹장) → /create
 *  - 초대 코드로 참가 (그룹원) → /join
 */
export default function HomeScreen() {
  const router = useRouter();
  const [name, setName] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('rider-name').then((v) => v && setName(v));
  }, []);

  const withName = (path: '/create' | '/join') => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('입력 필요', '라이더 이름을 입력하세요.');
      return;
    }
    AsyncStorage.setItem('rider-name', trimmed);
    router.push({ pathname: path, params: { name: trimmed } });
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
            placeholder="예: 홍길동"
            placeholderTextColor="#888"
            autoCapitalize="none"
          />

          <Pressable style={styles.primaryButton} onPress={() => withName('/create')}>
            <ThemedText type="subtitle" style={styles.primaryLabel}>
              그룹 만들기
            </ThemedText>
            <ThemedText type="small" style={styles.primaryLabel}>
              그룹장 — Ride와 Pack을 만들고 초대
            </ThemedText>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={() => withName('/join')}>
            <ThemedText type="subtitle" style={styles.secondaryLabel}>
              초대 코드로 참가
            </ThemedText>
            <ThemedText type="small">Pack은 자동으로 배정됩니다</ThemedText>
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
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#208AEF',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 4,
  },
  primaryLabel: { color: '#fff' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 4,
  },
  secondaryLabel: { color: '#208AEF' },
});
