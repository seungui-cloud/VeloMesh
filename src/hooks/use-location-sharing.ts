import * as Location from 'expo-location';
import { Room, RoomEvent, RemoteParticipant } from 'livekit-client';
import { useEffect, useRef, useState } from 'react';

import { RiderLocation } from '@/lib/geo';

export const LOCATION_TOPIC = 'loc';
const PUBLISH_INTERVAL_MS = 3000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * MVP v0.1 기본 GPS 위치 공유.
 * 내 GPS 위치를 LiveKit data channel(topic: "loc")로 Pack에 브로드캐스트하고,
 * 다른 라이더의 위치를 수신해 identity → RiderLocation 맵으로 유지한다.
 * PoC 단계에서는 별도 백엔드 없이 LiveKit만으로 동작한다.
 */
export function useLocationSharing(room: Room | undefined, connected: boolean) {
  const [myLocation, setMyLocation] = useState<RiderLocation | null>(null);
  const [riderLocations, setRiderLocations] = useState<Record<string, RiderLocation>>({});
  const lastPublishRef = useRef(0);

  useEffect(() => {
    if (!room || !connected) return;

    const onData = (payload: Uint8Array, participant?: RemoteParticipant, _?: unknown, topic?: string) => {
      if (topic !== LOCATION_TOPIC || !participant) return;
      try {
        const loc = JSON.parse(decoder.decode(payload)) as RiderLocation;
        setRiderLocations((prev) => ({ ...prev, [participant.identity]: loc }));
      } catch {
        // 잘못된 페이로드는 무시
      }
    };
    room.on(RoomEvent.DataReceived, onData);

    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: PUBLISH_INTERVAL_MS,
          distanceInterval: 5,
        },
        (pos) => {
          const loc: RiderLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed ?? 0,
            ts: pos.timestamp,
          };
          setMyLocation(loc);
          const now = Date.now();
          if (now - lastPublishRef.current >= PUBLISH_INTERVAL_MS && room.state === 'connected') {
            lastPublishRef.current = now;
            room.localParticipant
              .publishData(encoder.encode(JSON.stringify(loc)), {
                reliable: false,
                topic: LOCATION_TOPIC,
              })
              .catch(() => {});
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      room.off(RoomEvent.DataReceived, onData);
      subscription?.remove();
    };
  }, [room, connected]);

  return { myLocation, riderLocations };
}
