import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { displayNameFromSession, getSession, signInWithKakao, signOut } from '@/lib/supabase';

/**
 * 홈: 카카오 로그인(또는 게스트) + 이름 →
 *  - 그룹 만들기 (그룹장) → /create
 *  - 초대 코드로 참가 (그룹원) → /join
 */
export default function HomeScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('rider-name').then((v) => v && setName(v));
    getSession()
      .then((s) => {
        setSession(s);
        const kakaoName = displayNameFromSession(s);
        if (kakaoName) setName((prev) => prev || kakaoName);
      })
      .catch(() => {});
  }, []);

  const kakaoLogin = useCallback(async () => {
    try {
      const s = await signInWithKakao();
      setSession(s);
      const kakaoName = displayNameFromSession(s);
      if (kakaoName) setName(kakaoName);
    } catch (e) {
      Alert.alert('카카오 로그인 실패', String((e as Error).message));
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setSession(null);
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

  const isKakao = !!session && !session.user.is_anonymous;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}>
          <ThemedText type="title" style={styles.slogan}>
            Stay connected.{'\n'}Ride together.
          </ThemedText>

          {isKakao ? (
            <ThemedView style={styles.accountRow}>
              <ThemedText type="small">
                카카오 로그인됨{displayNameFromSession(session) ? ` · ${displayNameFromSession(session)}` : ''}
              </ThemedText>
              <Pressable onPress={logout}>
                <ThemedText type="small" style={styles.logout}>
                  로그아웃
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : (
            <Pressable style={styles.kakaoButton} onPress={kakaoLogin}>
              <ThemedText type="smallBold" style={styles.kakaoLabel}>
                카카오로 시작하기
              </ThemedText>
            </Pressable>
          )}

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

          <Pressable style={styles.bellEntry} onPress={() => router.push('/di2')}>
            <ThemedText type="smallBold" style={styles.secondaryLabel}>
              🔔 Di2 Phone Bell
            </ThemedText>
          </Pressable>

          {!isKakao && (
            <ThemedText type="small" style={styles.guestHint}>
              로그인 없이 계속하면 게스트로 참가합니다.
            </ThemedText>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  form: { flex: 1, padding: 24, gap: 10, justifyContent: 'center' },
  slogan: { marginBottom: 16 },
  kakaoButton: {
    backgroundColor: '#FEE500',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  kakaoLabel: { color: '#191919' },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logout: { color: '#E74C3C' },
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
  bellEntry: { alignItems: 'center', paddingVertical: 12 },
  guestHint: { textAlign: 'center', marginTop: 4 },
});
