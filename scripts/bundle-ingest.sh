#!/usr/bin/env bash
# ingest Edge Function 배포 번들 준비.
#
# 문제: functions/ingest는 packages/core/src/adapters의 파일들을 ../../../ 상대경로로
# import한다. 배포 번들엔 functions/ingest/ 아래만 올라가므로 그 경로가 번들 안에
# 존재하지 않아 배포가 깨진다.
#
# 해결: 배포 직전에 해당 파일들을 _shared/로 복사하고 import 경로를 ./_shared/로 치환한다.
# 매 배포마다 core에서 새로 복사하므로 번들이 core보다 낡을 일이 없다.
#
# _shared/는 생성물이라 gitignore된다. 편집하지 마라 — 원본은 packages/core다.
set -euo pipefail

cd "$(dirname "$0")/.."
FN=supabase/functions/ingest
SRC=packages/core/src/adapters

rm -rf "$FN/_shared"
mkdir -p "$FN/_shared"
# seoul-jobs.ts는 퇴근후 판정(isAfterWorkShift 등)의 SoT라 함께 번들에 넣는다.
# audience.ts도 같은 성격 — 아동 전용 게이트(isKidsOnly)의 SoT. 빠뜨리면 배포 번들에서
# import가 깨져 적재 자체가 안 된다(0017 컬럼도 영영 안 채워진다).
# kopis.ts는 KOPIS 시설 색인/주소 파싱의 SoT(import 없는 leaf).
cp "$SRC/util.ts" "$SRC/ingest-fetch.ts" "$SRC/seoul-jobs.ts" "$SRC/audience.ts" \
   "$SRC/kopis.ts" "$SRC/gu-fallback.ts" "$FN/_shared/"

# seoul-jobs.ts는 core ../types를 import한다(번들엔 없는 경로) → types.ts도 함께 복사하고
# 경로를 ./types로 맞춘다.
cp packages/core/src/types.ts "$FN/_shared/"
sed -i '' 's|from "\.\./types"|from "./types.ts"|g' "$FN/_shared/seoul-jobs.ts"

# gu-fallback.ts는 leaf다(normalizeGu를 복제해 들고 있다) — 따라갈 체인이 없다.
# core 내부를 import하게 만들면 Deno(확장자 필수)와 tsc(TS5097)가 충돌해 배포가 깨진다.

# import 경로 치환 — 원본 파일은 건드리지 않고 번들용 사본만 만든다.
for f in index.ts adapters.ts; do
  sed 's|\.\./\.\./\.\./packages/core/src/adapters/|./_shared/|g' "$FN/$f" > "$FN/_shared/$f.bundled"
done

echo "번들 준비 완료: $FN/_shared/"
ls -1 "$FN/_shared/"
