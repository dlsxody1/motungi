import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Supabase auth 세션용 저장소 어댑터 — refresh token을 OS 보안 저장소(Keychain/Keystore)에 둔다.
 *
 * SecureStore는 값 하나가 약 2KB로 제한되는데 세션 JSON은 그보다 크다. 그래서 값을
 * CHUNK_SIZE 단위로 쪼개 `${key}.0`, `${key}.1`… 로 저장하고 `${key}.n`에 청크 개수를 둔다.
 * (SecureStore 키는 영숫자·`.`·`-`·`_`만 허용 — Supabase 키(`sb-…-auth-token`)와 접미사 모두 해당.)
 *
 * - 기존 설치는 평문 AsyncStorage에 세션이 있다. 첫 getItem에서 읽어 보안 저장소로 옮기고 지운다(로그아웃 방지).
 * - web(expo start --web)은 SecureStore가 없어 AsyncStorage를 그대로 쓴다.
 * - zustand 영속 상태는 이 어댑터를 쓰지 않는다(AsyncStorage 유지).
 */
export const CHUNK_SIZE = 1800;

const countKey = (key: string) => `${key}.n`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

async function removeSecure(key: string): Promise<void> {
  const raw = await SecureStore.getItemAsync(countKey(key));
  const count = raw === null ? 0 : Number.parseInt(raw, 10);
  if (Number.isFinite(count)) {
    for (let i = 0; i < count; i += 1) await SecureStore.deleteItemAsync(chunkKey(key, i));
  }
  await SecureStore.deleteItemAsync(countKey(key));
}

async function readSecure(key: string): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(countKey(key));
  if (raw === null) return null;
  const count = Number.parseInt(raw, 10);
  if (!Number.isFinite(count) || count < 0) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i));
    if (part === null) return null; // 청크가 유실되면 깨진 JSON 대신 "세션 없음"으로 처리
    parts.push(part);
  }
  return parts.join("");
}

async function writeSecure(key: string, value: string): Promise<void> {
  await removeSecure(key); // 이전 값이 더 길었다면 남는 청크를 먼저 치운다
  const count = Math.ceil(value.length / CHUNK_SIZE);
  for (let i = 0; i < count; i += 1) {
    await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
  }
  await SecureStore.setItemAsync(countKey(key), String(count));
}

export const secureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") return AsyncStorage.getItem(key);
    const secure = await readSecure(key);
    if (secure !== null) return secure;
    const legacy = await AsyncStorage.getItem(key);
    if (legacy !== null) {
      await writeSecure(key, legacy);
      await AsyncStorage.removeItem(key);
    }
    return legacy;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
    await writeSecure(key, value);
    await AsyncStorage.removeItem(key);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") return AsyncStorage.removeItem(key);
    await removeSecure(key);
    await AsyncStorage.removeItem(key);
  },
};
