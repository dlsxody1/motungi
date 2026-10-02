import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

const secure = new Map<string, string>();
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (k: string) => secure.get(k) ?? null),
  setItemAsync: vi.fn(async (k: string, v: string) => {
    if (v.length > 2048) throw new Error("SecureStore value too large");
    secure.set(k, v);
  }),
  deleteItemAsync: vi.fn(async (k: string) => {
    secure.delete(k);
  }),
}));

const plain = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => plain.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      plain.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      plain.delete(k);
    }),
  },
}));

import { CHUNK_SIZE, secureAuthStorage as storage } from "./secure-storage";

const KEY = "sb-test-auth-token";
const big = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(97 + (i % 26))).join("");

describe("secureAuthStorage", () => {
  beforeEach(() => {
    secure.clear();
    plain.clear();
    Platform.OS = "ios";
  });

  it("2KB를 넘는 값을 청크로 쪼개 저장하고 그대로 복원한다", async () => {
    const value = big(CHUNK_SIZE * 2 + 123);
    await storage.setItem(KEY, value);

    expect(secure.get(`${KEY}.n`)).toBe("3");
    expect([...secure.values()].every((v) => v.length <= 2048)).toBe(true);
    expect(await storage.getItem(KEY)).toBe(value);
    expect(plain.size).toBe(0);
  });

  it("값이 짧아지면 남는 청크를 지운다", async () => {
    await storage.setItem(KEY, big(CHUNK_SIZE * 3));
    await storage.setItem(KEY, "short");

    expect(secure.get(`${KEY}.n`)).toBe("1");
    expect(secure.has(`${KEY}.1`)).toBe(false);
    expect(await storage.getItem(KEY)).toBe("short");
  });

  it("removeItem은 모든 청크와 개수 키를 지운다", async () => {
    await storage.setItem(KEY, big(CHUNK_SIZE * 2 + 1));
    await storage.removeItem(KEY);

    expect(secure.size).toBe(0);
    expect(await storage.getItem(KEY)).toBeNull();
  });

  it("저장된 값이 없으면 null", async () => {
    expect(await storage.getItem(KEY)).toBeNull();
  });

  it("청크가 유실되면 깨진 값 대신 null", async () => {
    await storage.setItem(KEY, big(CHUNK_SIZE * 2));
    secure.delete(`${KEY}.1`);

    expect(await storage.getItem(KEY)).toBeNull();
  });

  it("기존 평문 AsyncStorage 세션을 보안 저장소로 옮기고 평문을 지운다", async () => {
    const legacy = big(CHUNK_SIZE + 50);
    plain.set(KEY, legacy);

    expect(await storage.getItem(KEY)).toBe(legacy);
    expect(plain.has(KEY)).toBe(false);
    expect(secure.get(`${KEY}.n`)).toBe("2");
    expect(await storage.getItem(KEY)).toBe(legacy);
  });

  it("web에서는 AsyncStorage를 그대로 쓴다", async () => {
    Platform.OS = "web";
    await storage.setItem(KEY, "v");

    expect(plain.get(KEY)).toBe("v");
    expect(secure.size).toBe(0);
    expect(await storage.getItem(KEY)).toBe("v");
    await storage.removeItem(KEY);
    expect(plain.has(KEY)).toBe(false);
  });
});
