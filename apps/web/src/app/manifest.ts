import type { MetadataRoute } from "next";

/**
 * PWA 매니페스트 — 홈 화면 추가 시 이름·아이콘·테마색.
 * 아이콘은 icon.svg(마스커블) 하나로 커버(벡터라 모든 크기 대응).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "모퉁이 Corner",
    short_name: "모퉁이",
    description: "퇴근하고 뭐하지? — 퇴근 후·주말 내 동네 문화·여가 큐레이션.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f0eb",
    theme_color: "#f4f0eb",
    lang: "ko",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        type: "image/png",
        sizes: "180x180",
        purpose: "maskable",
      },
    ],
  };
}
