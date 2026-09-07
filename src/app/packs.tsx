import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RidePacks, listPacks, switchPack } from '@/lib/supabase';

/**
 * Pack 선택 화면. 자동 배정은 초기값일 뿐, 참가자·그룹장 모두
 * 원하는 Pack을 탭해서 이동한 뒤 입장한다 (기획서 13장 Pack 이동).
 */
export default function PacksScreen() {
  const router = useRouter();
  const { name, ride } = useLocalSearchParams<{ name: string; ride: string }>();
  const [data, setData] = useState<RidePacks | null>(null);
  const [entering, setEntering] = useState<string | null>(null);

  const load = useCallback(() => {
    listPacks(ride!)
      .then(setData)
      .catch((e) => Alert.alert('오류', String((e as Error).message)));
  }, [ride]);

  useEffect(load, [load]);

  const enter = async (packId: string, packName: string, mine: boolean) => {
    setEntering(packId);
    try {
      if (!mine) await switchPack(data!.rideId, packId);
      router.replace({
        pathname: '/room',
        params: { name: name!, ride: ride!, pack: packName },
      });
    } catch (e) {
      Alert.alert('오류', String((e as Error).message));
      setEntering(null);
    }
  };

  if (!data) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{data.title}</ThemedText>
          <ThemedText type="small">
            초대 코드 {data.code} · 들어갈 Pack을 선택하세요
          </ThemedText>
        </View>

        <FlatList
          data={data.packs}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.packRow, item.mine && styles.packRowMine]}
              disabled={entering !== null}
              onPress={() => enter(item.id, item.name, item.mine)}>
              <View style={styles.packInfo}>
                <ThemedText type="subtitle" style={item.mine ? styles.mineLabel : undefined}>
                  Pack {item.name}
                </ThemedText>
                <ThemedText type="small" style={item.mine ? styles.mineLabel : undefined}>
                  {item.riders}명{item.mine ? ' · 현재 배정' : ''}
                </ThemedText>
              </View>
              {entering === item.id ? (
                <ActivityIndicator color={item.mine ? '#fff' : '#208AEF'} />
              ) : (
                <ThemedText type="smallBold" style={item.mine ? styles.mineLabel : styles.enterLabel}>
                  입장 →
                </ThemedText>
              )}
            </Pressable>
          )}
        />

        <Pressable onPress={load} style={styles.refresh}>
          <ThemedText type="small" style={styles.enterLabel}>
            새로고침
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1, padding: 20, gap: 12 },
  header: { gap: 4 },
  list: { gap: 10, paddingVertical: 8 },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  packRowMine: { backgroundColor: '#208AEF' },
  packInfo: { flex: 1, gap: 2 },
  mineLabel: { color: '#fff' },
  enterLabel: { color: '#208AEF' },
  refresh: { alignItems: 'center', paddingVertical: 8 },
});
