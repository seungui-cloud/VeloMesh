import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device, State, Subscription } from 'react-native-ble-plx';

/**
 * Di2 히든버튼 BLE PoC (기획서 23장, PoC 03).
 *
 * Shimano 12단 Di2의 BLE 프로토콜은 공개 문서가 없으므로, PoC 단계에서는
 * 1) 주변 BLE 기기를 스캔해 Di2(무선 유닛)를 찾고
 * 2) 연결 후 notify 가능한 모든 characteristic을 구독하여
 * 3) 히든버튼을 눌렀을 때 어떤 이벤트가 오는지 관찰한다.
 * 관찰로 characteristic이 특정되면 이후 버전에서 해당 UUID만 구독하도록 좁힌다.
 */

export interface Di2Event {
  serviceUUID: string;
  charUUID: string;
  /** base64 원문 */
  value: string;
  /** hex 표현 */
  hex: string;
  ts: number;
}

export interface ScannedDevice {
  id: string;
  name: string;
  rssi: number | null;
}

let _manager: BleManager | null = null;

export function getBleManager(): BleManager {
  if (!_manager) _manager = new BleManager();
  return _manager;
}

/** Android 12+ 런타임 BLE 권한 요청 */
export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const api = Number(Platform.Version);
  if (api >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(result).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  }
  const fine = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return fine === PermissionsAndroid.RESULTS.GRANTED;
}

export async function waitForPoweredOn(): Promise<void> {
  const manager = getBleManager();
  const state = await manager.state();
  if (state === State.PoweredOn) return;
  await new Promise<void>((resolve, reject) => {
    const sub = manager.onStateChange((s) => {
      if (s === State.PoweredOn) {
        sub.remove();
        resolve();
      } else if (s === State.Unsupported || s === State.Unauthorized) {
        sub.remove();
        reject(new Error(`Bluetooth 사용 불가: ${s}`));
      }
    }, true);
  });
}

export function base64ToHex(b64: string): string {
  try {
    const bin = globalThis.atob(b64);
    return Array.from(bin, (c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
  } catch {
    return b64;
  }
}

/**
 * 연결된 기기의 notify 가능한 모든 characteristic을 구독한다.
 * 반환된 함수를 호출하면 전체 구독이 해제된다.
 */
export async function monitorAllCharacteristics(
  device: Device,
  onEvent: (e: Di2Event) => void,
  onInfo: (msg: string) => void,
): Promise<() => void> {
  const discovered = await device.discoverAllServicesAndCharacteristics();
  const services = await discovered.services();
  const subscriptions: Subscription[] = [];
  let notifiable = 0;

  for (const service of services) {
    const chars = await service.characteristics();
    for (const ch of chars) {
      if (!ch.isNotifiable && !ch.isIndicatable) continue;
      notifiable += 1;
      subscriptions.push(
        ch.monitor((error, updated) => {
          if (error || !updated?.value) return;
          onEvent({
            serviceUUID: service.uuid,
            charUUID: updated.uuid,
            value: updated.value,
            hex: base64ToHex(updated.value),
            ts: Date.now(),
          });
        }),
      );
    }
  }
  onInfo(`서비스 ${services.length}개, 구독한 characteristic ${notifiable}개`);
  return () => subscriptions.forEach((s) => s.remove());
}
