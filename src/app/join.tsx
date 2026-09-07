import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { joinRide } from '@/lib/supabase';

/**
 * 그룹원: 초대 코드로 참가 → 인원이 가장 적은 Pack에 자동 배정 → 입장.
 * 딥링크 velomesh:///join?code=XXXXXX 도 처리한다.
 */
export default function JoinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string; code?: string }>();
  const [name, setName] = useState(params.name ?? '');
  const [code, setCode] = useState(params.code ?? '');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!name) AsyncStorage.getItem('rider-name').then((v) => v && setName(v));
  }, [name]);

  const join = async () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName || !trimmedCode) {
      Alert.alert('입력 필요', '이름과 초대 코드를 입력하세요.');
      return;
    }
    setJoining(true);
    try {
      AsyncStorage.setItem('rider-name', trimmedName);
      const membership = await joinRide(trimmedCode, trimmedName);
      router.replace({
        pathname: '/packs',
        params: { name: trimmedName, ride: membership.code },
      });
    } catch (e) {
      Alert.alert('오류', String((e as Error).message));
    } finally {
      setJoining(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.form}>
          <ThemedText type="smallBold">라이더 이름</ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="예: 홍길동"
            placeholderTextColor="#888"
            autoCapitalize="none"
          />

          <ThemedText type="smallBold">초대 코드</ThemedText>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={code}
            onChangeText={setCode}
            placeholder="ABC123"
            placeholderTextColor="#888"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />
          <ThemedText type="small">참가하면 Pack이 자동으로 배정됩니다.</ThemedText>
        </View>

        <Pressable style={styles.primaryButton} onPress={join} disabled={joining}>
          {joining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="subtitle" style={styles.primaryLabel}>
              참가하기
            </ThemedText>
          )}
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: 24, gap: 12 },
  form: { flex: 1, gap: 10, justifyContent: 'center' },
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
  codeInput: { letterSpacing: 6, fontSize: 22, textAlign: 'center' },
  primaryButton: {
    backgroundColor: '#208AEF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryLabel: { color: '#fff' },
});
