import {
  AudioSession,
  LiveKitRoom,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from '@livekit/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ConnectionState } from 'livekit-client';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PackMap } from '@/components/pack-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLocationSharing } from '@/hooks/use-location-sharing';
import { distanceMeters, formatDistance, formatSpeed, RiderLocation } from '@/lib/geo';
import { fetchToken } from '@/lib/token';

/** Ride 코드 + Pack 이름으로 LiveKit 룸 이름을 만든다. 예: velomesh:SUNDAY:pack-A */
function packRoomName(ride: string, pack: string) {
  return `velomesh:${ride}:pack-${pack}`;
}

export default function RoomScreen() {
  const { name, ride, pack } = useLocalSearchParams<{ name: string; ride: string; pack: string }>();
  const [connection, setConnection] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    AudioSession.startAudioSession();
    fetchToken(packRoomName(ride!, pack!), name!)
      .then((res) => active && setConnection(res))
      .catch((e) => active && setError(String(e.message ?? e)));
    return () => {
      active = false;
      AudioSession.stopAudioSession();
    };
  }, [ride, pack, name]);

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="subtitle">연결 실패</ThemedText>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </ThemedView>
    );
  }

  if (!connection) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
        <ThemedText>토큰 발급 중…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={connection.url}
      token={connection.token}
      connect
      audio
      video={false}
      options={{ adaptiveStream: false }}>
      <PackVoiceView pack={pack!} />
    </LiveKitRoom>
  );
}

function PackVoiceView({ pack }: { pack: string }) {
  const router = useRouter();
  const room = useRoomContext();
  const participants = useParticipants();
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState(room);
  const connected = connectionState === ConnectionState.Connected;
  const { myLocation, riderLocations } = useLocationSharing(room, connected);

  const toggleMic = () => {
    localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.header}>
          <ThemedText type="title">Pack {pack}</ThemedText>
          <ThemedText type="small">
            {connected ? `연결됨 · ${participants.length}명` : '연결 중…'}
            {myLocation ? ` · ${formatSpeed(myLocation.speed)}` : ''}
          </ThemedText>
        </View>

        <PackMap myLocation={myLocation} riderLocations={riderLocations} />

        <FlatList
          data={participants}
          keyExtractor={(p) => p.identity}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isMe = item.identity === localParticipant.identity;
            const loc: RiderLocation | undefined = isMe
              ? (myLocation ?? undefined)
              : riderLocations[item.identity];
            const gap = !isMe && loc && myLocation ? distanceMeters(myLocation, loc) : null;
            return (
              <View style={styles.riderRow}>
                <View style={[styles.speakingDot, item.isSpeaking && styles.speakingDotActive]} />
                <View style={styles.riderInfo}>
                  <ThemedText type="smallBold">
                    {item.identity}
                    {isMe ? ' (나)' : ''}
                  </ThemedText>
                  <ThemedText type="small">
                    {loc ? formatSpeed(loc.speed) : 'GPS 대기'}
                    {gap !== null ? ` · ${formatDistance(gap)} 거리` : ''}
                  </ThemedText>
                </View>
                {item.isMicrophoneEnabled === false && <ThemedText type="small">🔇</ThemedText>}
              </View>
            );
          }}
        />

        <Pressable
          style={[styles.micButton, !isMicrophoneEnabled && styles.micButtonMuted]}
          onPress={toggleMic}>
          <ThemedText type="subtitle" style={styles.micLabel}>
            {isMicrophoneEnabled ? '마이크 켜짐 — Full Duplex' : '음소거됨 — 탭하여 해제'}
          </ThemedText>
        </Pressable>

        <Pressable style={styles.leaveButton} onPress={() => router.back()}>
          <ThemedText type="smallBold" style={styles.leaveLabel}>
            라이딩 종료
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: 20, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorText: { textAlign: 'center' },
  header: { gap: 4 },
  list: { gap: 4, paddingVertical: 8 },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8884',
  },
  riderInfo: { flex: 1, gap: 2 },
  speakingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#8886',
  },
  speakingDotActive: { backgroundColor: '#2ECC71' },
  micButton: {
    backgroundColor: '#208AEF',
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: 'center',
  },
  micButtonMuted: { backgroundColor: '#E74C3C' },
  micLabel: { color: '#fff' },
  leaveButton: { alignItems: 'center', paddingVertical: 12 },
  leaveLabel: { color: '#E74C3C' },
});
