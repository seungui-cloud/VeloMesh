import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { playBell, prepareBell } from '@/lib/bell';
import {
  Di2Event,
  ScannedDevice,
  getBleManager,
  monitorAllCharacteristics,
  requestBlePermissions,
  waitForPoweredOn,
} from '@/lib/di2';

/**
 * Di2 Phone Bell + BLE PoC 화면 (기획서 21~24장, PoC 03).
 * - 큰 벨 버튼: 항상 동작 (서버/네트워크/Di2 무관)
 * - BLE 스캔 → Di2 연결 → 모든 notify characteristic 구독 → 이벤트 로그
 * - "이벤트 수신 시 벨 울리기"를 켜면 히든버튼 → 벨 파이프라인 검증 가능
 */
export default function Di2Screen() {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [connected, setConnected] = useState<Device | null>(null);
  const [events, setEvents] = useState<(Di2Event & { key: string })[]>([]);
  const [info, setInfo] = useState('');
  const [bellOnEvent, setBellOnEvent] = useState(true);
  const bellOnEventRef = useRef(bellOnEvent);
  const stopMonitorRef = useRef<(() => void) | null>(null);
  const lastBellRef = useRef(0);

  bellOnEventRef.current = bellOnEvent;

  useEffect(() => {
    prepareBell();
    return () => {
      getBleManager().stopDeviceScan();
      stopMonitorRef.current?.();
      connected?.cancelConnection().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startScan = async () => {
    try {
      const granted = await requestBlePermissions();
      if (!granted) {
        Alert.alert('권한 필요', 'Bluetooth 권한을 허용해주세요.');
        return;
      }
      await waitForPoweredOn();
      setDevices([]);
      setScanning(true);
      getBleManager().startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) {
          setScanning(false);
          Alert.alert('스캔 오류', error.message);
          return;
        }
        if (!device) return;
        setDevices((prev) => {
          if (prev.some((d) => d.id === device.id)) return prev;
          const next = [
            ...prev,
            { id: device.id, name: device.name ?? device.localName ?? '(이름 없음)', rssi: device.rssi },
          ];
          // 이름 있는 기기 우선 + 신호 세기순
          return next.sort((a, b) => {
            const an = a.name !== '(이름 없음)' ? 0 : 1;
            const bn = b.name !== '(이름 없음)' ? 0 : 1;
            return an - bn || (b.rssi ?? -999) - (a.rssi ?? -999);
          });
        });
      });
    } catch (e) {
      setScanning(false);
      Alert.alert('오류', String((e as Error).message));
    }
  };

  const stopScan = () => {
    getBleManager().stopDeviceScan();
    setScanning(false);
  };

  const connect = async (id: string) => {
    stopScan();
    setInfo('연결 중…');
    try {
      const device = await getBleManager().connectToDevice(id, { timeout: 15000 });
      setConnected(device);
      const stop = await monitorAllCharacteristics(
        device,
        (e) => {
          setEvents((prev) =>
            [{ ...e, key: `${e.ts}-${e.charUUID}` }, ...prev].slice(0, 30),
          );
          // 이벤트 → 벨 (300ms 디바운스: 연타/멀티패킷 방지)
          if (bellOnEventRef.current && Date.now() - lastBellRef.current > 300) {
            lastBellRef.current = Date.now();
            playBell();
          }
        },
        setInfo,
      );
      stopMonitorRef.current = stop;
      device.onDisconnected(() => {
        setConnected(null);
        setInfo('연결 끊김');
        stopMonitorRef.current?.();
        stopMonitorRef.current = null;
      });
    } catch (e) {
      setInfo('');
      Alert.alert('연결 실패', String((e as Error).message));
    }
  };

  const disconnect = async () => {
    stopMonitorRef.current?.();
    stopMonitorRef.current = null;
    await connected?.cancelConnection().catch(() => {});
    setConnected(null);
    setInfo('');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Pressable style={styles.bellButton} onPress={playBell}>
          <ThemedText type="title" style={styles.bellLabel}>
            🔔 벨 울리기
          </ThemedText>
          <ThemedText type="small" style={styles.bellLabel}>
            Di2 없이도 항상 동작
          </ThemedText>
        </Pressable>

        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold">Di2 연결 (PoC)</ThemedText>
          {connected ? (
            <Pressable onPress={disconnect}>
              <ThemedText type="small" style={styles.danger}>
                연결 해제
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable onPress={scanning ? stopScan : startScan}>
              <ThemedText type="small" style={styles.link}>
                {scanning ? '스캔 중지' : 'BLE 스캔'}
              </ThemedText>
            </Pressable>
          )}
        </View>

        {connected ? (
          <>
            <ThemedText type="small">
              연결됨: {connected.name ?? connected.id} {info ? `· ${info}` : ''}
            </ThemedText>
            <View style={styles.toggleRow}>
              <ThemedText type="small">이벤트 수신 시 벨 울리기</ThemedText>
              <Switch value={bellOnEvent} onValueChange={setBellOnEvent} />
            </View>
            <ThemedText type="small" style={styles.hint}>
              Di2 히든버튼을 눌러보세요. 아래에 수신 이벤트가 기록됩니다.
            </ThemedText>
            <FlatList
              style={styles.list}
              data={events}
              keyExtractor={(e) => e.key}
              renderItem={({ item }) => (
                <View style={styles.eventRow}>
                  <ThemedText type="code" style={styles.eventText}>
                    {new Date(item.ts).toLocaleTimeString()} · {item.charUUID.slice(4, 8)} ·{' '}
                    {item.hex}
                  </ThemedText>
                </View>
              )}
              ListEmptyComponent={
                <ThemedText type="small" style={styles.hint}>
                  아직 수신된 이벤트가 없습니다.
                </ThemedText>
              }
            />
          </>
        ) : (
          <FlatList
            style={styles.list}
            data={devices}
            keyExtractor={(d) => d.id}
            renderItem={({ item }) => (
              <Pressable style={styles.deviceRow} onPress={() => connect(item.id)}>
                <View style={styles.deviceInfo}>
                  <ThemedText type="smallBold">{item.name}</ThemedText>
                  <ThemedText type="small">{item.id}</ThemedText>
                </View>
                <ThemedText type="small">{item.rssi ?? '?'} dBm</ThemedText>
              </Pressable>
            )}
            ListEmptyComponent={
              <ThemedText type="small" style={styles.hint}>
                {scanning
                  ? '주변 BLE 기기를 찾는 중…'
                  : 'BLE 스캔을 눌러 Di2 무선 유닛을 찾으세요.\nDi2가 켜져 있고 E-TUBE 앱과 연결되지 않은 상태여야 합니다.'}
              </ThemedText>
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: 20, gap: 12 },
  bellButton: {
    backgroundColor: '#208AEF',
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 4,
  },
  bellLabel: { color: '#fff' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  link: { color: '#208AEF' },
  danger: { color: '#E74C3C' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hint: { textAlign: 'center', marginTop: 12, opacity: 0.7 },
  list: { flex: 1 },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8884',
    gap: 8,
  },
  deviceInfo: { flex: 1, gap: 2 },
  eventRow: { paddingVertical: 6 },
  eventText: { fontSize: 12 },
});
