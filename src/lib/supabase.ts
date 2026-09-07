import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
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
        flowType: 'pkce',
      },
    });
  }
  return _client;
}

export async function getSession(): Promise<Session | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}

/** 카카오 계정의 표시 이름 (닉네임 → 이름 → null 순) */
export function displayNameFromSession(session: Session | null): string | null {
  const meta = session?.user.user_metadata as Record<string, string> | undefined;
  return meta?.nickname ?? meta?.name ?? meta?.full_name ?? meta?.preferred_username ?? null;
}

/**
 * 카카오 로그인 (Supabase OAuth + PKCE).
 * 사전 조건: Supabase → Authentication → Providers → Kakao 활성화,
 * URL Configuration → Redirect URLs에 velomesh:///auth/callback 추가.
 */
export async function signInWithKakao(): Promise<Session> {
  const supabase = getSupabase();
  const redirectTo = Linking.createURL('auth/callback'); // velomesh:///auth/callback

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new Error(`카카오 로그인 시작 실패: ${error?.message}`);

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw new Error('카카오 로그인이 취소되었습니다.');

  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('카카오 로그인 응답에 인증 코드가 없습니다.');

  const { data: exchanged, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError || !exchanged.session) {
    throw new Error(`세션 교환 실패: ${exchangeError?.message}`);
  }
  return exchanged.session;
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
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
