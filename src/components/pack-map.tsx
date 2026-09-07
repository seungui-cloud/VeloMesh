import { Camera, Map as MapLibreMap, Marker } from '@maplibre/maplibre-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { RiderLocation } from '@/lib/geo';

// OpenFreeMap — API 키 불필요, 무료 (기획서 29장 비용 0원 원칙)
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

interface PackMapProps {
  myLocation: RiderLocation | null;
  /** identity → 위치 (다른 라이더들) */
  riderLocations: Record<string, RiderLocation>;
}

/**
 * Pack 실시간 지도 (기획서 14~15장).
 * 내 위치(파랑)와 같은 채널 라이더들의 위치(주황)를 표시한다.
 * 위치 데이터는 LiveKit data channel로 이미 공유되고 있는 것을 그대로 사용.
 */
export const PackMap = memo(function PackMap({ myLocation, riderLocations }: PackMapProps) {
  if (!myLocation) {
    return (
      <View style={[styles.map, styles.placeholder]}>
        <ThemedText type="small">GPS 위치를 기다리는 중…</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.map}>
      <MapLibreMap
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE}
        attribution={false}>
        <Camera center={[myLocation.lng, myLocation.lat]} zoom={14.5} />

        {Object.entries(riderLocations).map(([identity, loc]) => (
          <Marker key={identity} lngLat={[loc.lng, loc.lat]}>
            <View style={styles.rider}>
              <View style={[styles.dot, styles.riderDot]} />
              <View style={styles.nameTag}>
                <ThemedText type="small" style={styles.nameText}>
                  {identity}
                </ThemedText>
              </View>
            </View>
          </Marker>
        ))}

        <Marker lngLat={[myLocation.lng, myLocation.lat]}>
          <View style={styles.rider}>
            <View style={[styles.dot, styles.meDot]} />
            <View style={[styles.nameTag, styles.meTag]}>
              <ThemedText type="small" style={styles.nameText}>
                나
              </ThemedText>
            </View>
          </View>
        </Marker>
      </MapLibreMap>
    </View>
  );
});

const styles = StyleSheet.create({
  map: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#8882',
  },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  rider: { alignItems: 'center', gap: 2 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#fff',
  },
  meDot: { backgroundColor: '#208AEF' },
  riderDot: { backgroundColor: '#F5A623' },
  nameTag: {
    backgroundColor: '#F5A623',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  meTag: { backgroundColor: '#208AEF' },
  nameText: { color: '#fff', fontSize: 11 },
});
