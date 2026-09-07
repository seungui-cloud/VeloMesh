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

const PACK_PRESETS = [1, 2, 3] as const;
const PACK_NAMES = ['A', 'B', 'C'];

/** 그룹장: 그룹(Ride) + Pack 생성 → 초대 코드 공유 → 입장 */
export default function CreateScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const [title, setTitle] = useState('');
  const [packCount, setPackCount] = useState<(typeof PACK_PRESETS)[number]>(2);
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
      setResult(await createRide(trimmed, PACK_NAMES.slice(0, packCount), name!));
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
      pathname: '/room',
      params: { name: name!, ride: result.code, pack: result.pack_name },
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
              Pack {result.pack_name} 입장 (그룹장)
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
            {PACK_PRESETS.map((n) => (
              <Pressable
                key={n}
                onPress={() => setPackCount(n)}
                style={[styles.packButton, packCount === n && styles.packButtonActive]}>
                <ThemedText
                  type="smallBold"
                  style={packCount === n ? styles.primaryLabel : undefined}>
                  {n}개
                </ThemedText>
                <ThemedText
                  type="small"
                  style={packCount === n ? styles.primaryLabel : undefined}>
                  {PACK_NAMES.slice(0, n).join('·')}
                </ThemedText>
              </Pressable>
            ))}
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
  packRow: { flexDirection: 'row', gap: 8 },
  packButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#8884',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  packButtonActive: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
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
