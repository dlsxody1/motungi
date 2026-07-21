"use client";

import Script from "next/script";

/**
 * NAVER 지도 JavaScript SDK 로더 — 지도를 쓰는 페이지(상세)에 삽입.
 *
 * ⚠️ 이 키는 역지오코딩용 서버 시크릿(NAVER_MAP_CLIENT_ID/_SECRET)과 다르다.
 *    지도 JS SDK는 별도의 "공개" 클라이언트 키(ncpKeyId)를 요구하며 도메인 화이트리스트로 제한된다
 *    → NEXT_PUBLIC_ 접두어로 노출해도 안전하다(도메인 밖에선 동작 안 함).
 *    NCP 콘솔 → AI·NAVER API → Maps → Web Dynamic Map 인증정보.
 *
 * 키가 없으면(개발/미설정) SDK를 로드하지 않고, VenueMap이 지도 대신
 * "네이버 지도에서 열기" 폴백을 그린다.
 */
const NAVER_MAP_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

export function NaverMapSDK() {
  if (!NAVER_MAP_CLIENT_ID) return null;

  return (
    <Script
      src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAP_CLIENT_ID}`}
      strategy="afterInteractive"
    />
  );
}
