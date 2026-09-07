import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('.env에 EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY가 필요합니다.');
    }
    _client = createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

/** 세션이 없으면 익명 로그인. Low Friction 원칙 — 회원가입 없이 바로 참가. */
export async function ensureSignedIn(): Promise<string> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error || !anon.user) {
    throw new Error(
      `익명 로그인 실패: ${error?.message ?? '알 수 없음'}. Supabase 대시보드에서 Anonymous sign-ins가 켜져 있는지 확인하세요.`,
    );
  }
  return anon.user.id;
}

export interface RideMembership {
  ride_id: string;
  title: string;
  code: string;
  pack_id: string;
  pack_name: string;
  role: 'ride_leader' | 'pack_leader' | 'sweeper' | 'rider';
}

/** 그룹장: Ride + Pack들 생성, 본인은 ride_leader로 첫 Pack에 배정 */
export async function createRide(
  title: string,
  packNames: string[],
  displayName: string,
): Promise<RideMembership> {
  await ensureSignedIn();
  const { data, error } = await getSupabase().rpc('create_ride', {
    p_title: title,
    p_pack_names: packNames,
    p_display_name: displayName,
  });
  if (error) throw new Error(`그룹 생성 실패: ${error.message}`);
  return data as RideMembership;
}

/** 참가자: 초대 코드로 참가, 인원 최소 Pack에 자동 배정 */
export async function joinRide(code: string, displayName: string): Promise<RideMembership> {
  await ensureSignedIn();
  const { data, error } = await getSupabase().rpc('join_ride', {
    p_code: code,
    p_display_name: displayName,
  });
  if (error) {
    if (error.message.includes('INVALID_CODE')) throw new Error('초대 코드가 올바르지 않습니다.');
    throw new Error(`참가 실패: ${error.message}`);
  }
  return data as RideMembership;
}
