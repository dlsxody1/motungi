/**
 * 구형 상세 URL(`/opportunity?id=X`) → 정식 경로(`/opportunity/X`) 리다이렉트.
 *
 * 이 경로는 오래 정식 URL이었다 — 카카오로 공유된 링크, 저장된 북마크, 이미 크롤된 주소가
 * 밖에 남아 있다. 그냥 지우면 전부 404가 되므로 껍데기만 남겨 넘긴다.
 *
 * 308(permanent)인 이유: 크롤러에게 "정식 주소가 옮겨갔다"고 알려 기존 링크의 평가를
 * 새 경로로 넘긴다. 307/302면 구주소가 계속 정식으로 취급된다.
 */
import { permanentRedirect, redirect } from "next/navigation";

export default async function LegacyOpportunityPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  // id 없이 들어온 건 옮길 대상이 없다 — 탐색으로 보낸다(영구 이전이 아니므로 임시 리다이렉트).
  if (!id) redirect("/explore");
  permanentRedirect(`/opportunity/${encodeURIComponent(id)}`);
}
