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
import {
  ButtonMap,
  ButtonSide,
  Di2GestureEngine,
  GESTURE_LABEL,
  SIDE_LABEL,
  loadButtonMap,
  saveButtonMap,
} from '@/lib/di2-gestures';

interface LogLine {
  key: string;
  text: string;
  kind: 'raw' | 'gesture' | 'info';
}

/**
 * Di2 Phone Bell + BLE PoC 화면 (기획서 21~24장, PoC 03).
 * - 큰 벨 버튼: 항상 동작 (서버/네트워크/Di2 무관)
 * - BLE 스캔 → Di2 연결 → 버튼 학습(왼/오) → 짧게·2번·길게 제스처 판별 → 벨
 */
export default function Di2Screen() {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [connected, setConnected] = useState<Device | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [info, setInfo] = useState('');
  const [bellOnRaw, setBellOnRaw] = useState(false);
  const [buttonMap, setButtonMap] = useState<ButtonMap>({});
  const [learning, setLearning] = useState<ButtonSide | null>(null);
  const [learnCount, setLearnCount] = useState(0);
  const [noiseCount, setNoiseCount] = useState(0);

  const bellOnRawRef = useRef(bellOnRaw);
  const stopMonitorRef = useRef<(() => void) | null>(null);
  const lastBellRef = useRef(0);
  const engineRef = useRef<Di2GestureEngine | null>(null);

  bellOnRawRef.current = bellOnRaw;

  const addLog = (text: string, kind: LogLine['kind']) => {
    setLog((prev) =>
      [{ key: `${Date.now()}-${Math.random()}`, text, kind }, ...prev].slice(0, 40),
    );
  };

  useEffect(() => {
    prepareBell();
    const engine = new Di2GestureEngine(
      (g) => {
        addLog(`🎯 ${SIDE_LABEL[g.side]} 버튼 ${GESTURE_LABEL[g.kind]}`, 'gesture');
        // 기본 매핑: 짧게 1번 = 벨 1번, 2번 연속 = 벨 2번 (추후 Quick Event 매핑 예정)
        playBell();
        if (g.kind === 'double') setTimeout(playBell, 350);
      },
      (side, ok, message) => {
        setLearning(null);
        setLearnCount(0);
        if (ok) setButtonMap({ ...engineRef.current!.getMap() });
        addLog(`${ok ? '✅' : '⚠️'} ${SIDE_LABEL[side]} 버튼: ${message}`, 'info');
      },
      (_side, count) => setLearnCount(count),
    );
    engineRef.current = engine;
    loadButtonMap().then((m) => {
      engine.setMap(m);
      setButtonMap(m);
    });
    return () => {
      engine.dispose();
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
            {
              id: device.id,
              name: device.name ?? device.localName ?? '(이름 없음)',
              rssi: device.rssi,
            },
          ];
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

  const onEvent = (e: Di2Event) => {
    const engine = engineRef.current;
    const consumed = engine?.feed(e.charUUID, e.hex, e.ts) ?? false;
    if (consumed) return; // 학습 샘플 또는 버튼 이벤트 (제스처 로그는 엔진 콜백에서)
    if (engine?.isNoise(e.charUUID, e.hex)) {
      // 주기적 상태 방송 (예: 2ac1 반복) → 로그에서 숨기고 개수만 집계
      setNoiseCount((n) => n + 1);
      return;
    }
    addLog(`${e.charUUID.slice(4, 8)} · ${e.hex}`, 'raw');
    if (bellOnRawRef.current && Date.now() - lastBellRef.current > 300) {
      lastBellRef.current = Date.now();
      playBell();
    }
  };

  const connect = async (id: string) => {
    stopScan();
    setInfo('연결 중…');
    try {
      const device = await getBleManager().connectToDevice(id, { timeout: 15000 });
      setConnected(device);
      const stop = await monitorAllCharacteristics(device, onEvent, setInfo);
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

  const learn = (side: ButtonSide) => {
    engineRef.current?.startLearning(side);
    setLearning(side);
    setLearnCount(0);
    addLog(
      `${SIDE_LABEL[side]} 버튼 학습 — Di2 ${SIDE_LABEL[side]} 히든버튼을 천천히 5번 누르세요`,
      'info',
    );
  };

  const resetButtons = () => {
    engineRef.current?.setMap({});
    setButtonMap({});
    saveButtonMap({});
    addLog('버튼 등록 초기화됨', 'info');
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

            <View style={styles.learnRow}>
              {(['left', 'right'] as ButtonSide[]).map((side) => (
                <Pressable
                  key={side}
                  style={[styles.learnButton, learning === side && styles.learnButtonActive]}
                  onPress={() => learn(side)}>
                  <ThemedText
                    type="smallBold"
                    style={learning === side ? styles.bellLabel : styles.link}>
                    {learning === side
                      ? `5번 누르세요… (${learnCount})`
                      : `${SIDE_LABEL[side]} 학습${buttonMap[side] ? ' ✓' : ''}`}
                  </ThemedText>
                </Pressable>
              ))}
              <Pressable style={styles.resetButton} onPress={resetButtons}>
                <ThemedText type="small" style={styles.danger}>
                  초기화
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <ThemedText type="small">미등록 신호에도 벨 울리기</ThemedText>
              <Switch value={bellOnRaw} onValueChange={setBellOnRaw} />
            </View>

            {noiseCount > 0 && (
              <ThemedText type="small" style={styles.hint}>
                🔇 반복 상태 신호 {noiseCount}건 숨김 (Di2 주기 방송)
              </ThemedText>
            )}

            <FlatList
              style={styles.list}
              data={log}
              keyExtractor={(l) => l.key}
              renderItem={({ item }) => (
                <View style={styles.eventRow}>
                  <ThemedText
                    type={item.kind === 'gesture' ? 'smallBold' : 'code'}
                    style={[styles.eventText, item.kind === 'gesture' && styles.gestureText]}>
                    {item.text}
                  </ThemedText>
                </View>
              )}
              ListEmptyComponent={
                <ThemedText type="small" style={styles.hint}>
                  왼쪽/오른쪽 학습을 누른 뒤 Di2 히든버튼을 누르면 버튼이 등록되고,{'\n'}
                  이후 짧게 1번 / 2번 연속 / 길게가 각각 판별됩니다.
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
    paddingVertical: 28,
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
  learnRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  learnButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  learnButtonActive: { backgroundColor: '#208AEF' },
  resetButton: { paddingHorizontal: 4 },
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
  eventRow: { paddingVertical: 5 },
  eventText: { fontSize: 12 },
  gestureText: { color: '#208AEF', fontSize: 14 },
});
