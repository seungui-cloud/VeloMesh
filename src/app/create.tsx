import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createRide, RideMembership } from '@/lib/supabase';

const MAX_PACKS = 12;
/** A, B, C … 순서로 Pack 이름 생성 */
const packNames = (count: number) =>
  Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));

/** 그룹장: 그룹(Ride) + Pack 생성 → 초대 코드 공유 → 입장 */
export default function CreateScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const [title, setTitle] = useState('');
  const [packCount, setPackCount] = useState(2);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<RideMembership | null>(null);

  const create = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('입력 필요', '그룹 이름을 입력하세요.');
      return;
    }
    setCreating(true);
    try {
      setResult(await createRide(trimmed, packNames(packCount), name!));
    } catch (e) {
      Alert.alert('오류', String((e as Error).message));
    } finally {
      setCreating(false);
    }
  };

  const share = () => {
    if (!result) return;
    Share.share({
      message: `[VeloMesh] ${result.title} 라이딩에 초대합니다!\n앱에서 초대 코드를 입력하세요: ${result.code}`,
    });
  };

  const enter = () => {
    if (!result) return;
    router.replace({
      pathname: '/packs',
      params: { name: name!, ride: result.code },
    });
  };

  if (result) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.centerBlock}>
            <ThemedText type="subtitle">{result.title}</ThemedText>
            <ThemedText type="small">그룹이 만들어졌습니다. 초대 코드를 공유하세요.</ThemedText>
            <ThemedText type="title" style={styles.code}>
              {result.code}
            </ThemedText>
            <ThemedText type="small">
              그룹원은 초대 코드로 참가하면 Pack이 자동 배정됩니다.
            </ThemedText>
          </View>
          <Pressable style={styles.secondaryButton} onPress={share}>
            <ThemedText type="subtitle" style={styles.secondaryLabel}>
              초대 코드 공유
            </ThemedText>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={enter}>
            <ThemedText type="subtitle" style={styles.primaryLabel}>
              Pack 선택하고 입장
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.form}>
          <ThemedText type="smallBold">그룹 이름</ThemedText>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="예: 한강 야간 라이딩"
            placeholderTextColor="#888"
          />

          <ThemedText type="smallBold">Pack 수</ThemedText>
          <View style={styles.packRow}>
            <Pressable
              style={[styles.stepButton, packCount <= 1 && styles.stepButtonDisabled]}
              onPress={() => setPackCount((c) => Math.max(1, c - 1))}>
              <ThemedText type="subtitle">−</ThemedText>
            </Pressable>
            <View style={styles.packCountBox}>
              <ThemedText type="subtitle">{packCount}개</ThemedText>
              <ThemedText type="small">
                {packNames(packCount).join('·')}
              </ThemedText>
            </View>
            <Pressable
              style={[styles.stepButton, packCount >= MAX_PACKS && styles.stepButtonDisabled]}
              onPress={() => setPackCount((c) => Math.min(MAX_PACKS, c + 1))}>
              <ThemedText type="subtitle">＋</ThemedText>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={create} disabled={creating}>
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="subtitle" style={styles.primaryLabel}>
              그룹 만들기
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
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  code: { letterSpacing: 8, color: '#208AEF' },
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
  packRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  stepButton: {
    width: 64,
    borderWidth: 1,
    borderColor: '#8884',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: { opacity: 0.3 },
  packCountBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  primaryButton: {
    backgroundColor: '#208AEF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryLabel: { color: '#fff' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  secondaryLabel: { color: '#208AEF' },
});
