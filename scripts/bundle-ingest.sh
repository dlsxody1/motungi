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
cp "$SRC/util.ts" "$SRC/ingest-fetch.ts" "$SRC/seoul-jobs.ts" "$FN/_shared/"

# seoul-jobs.ts는 core ../types를 import한다(번들엔 없는 경로) → types.ts도 함께 복사하고
# 경로를 ./types로 맞춘다. types.ts는 자체 import가 없어 이 한 겹으로 닫힌다.
cp packages/core/src/types.ts "$FN/_shared/"
sed -i '' 's|from "\.\./types"|from "./types.ts"|g' "$FN/_shared/seoul-jobs.ts"

# import 경로 치환 — 원본 파일은 건드리지 않고 번들용 사본만 만든다.
for f in index.ts adapters.ts; do
  sed 's|\.\./\.\./\.\./packages/core/src/adapters/|./_shared/|g' "$FN/$f" > "$FN/_shared/$f.bundled"
done

echo "번들 준비 완료: $FN/_shared/"
ls -1 "$FN/_shared/"
