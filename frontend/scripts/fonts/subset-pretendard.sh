#!/usr/bin/env bash
# Pretendard 원본 가변 폰트를 서비스가 쓰는 문자만 남긴 서브셋으로 만든다.
#
# 정본 명세: docs/features/layout/pretendard-subset.md D4-2.
#
# 폰트 버전을 올릴 때만 사람이 1회 돌린다(D8-7). CI 에 넣지 않는다 — 빌드마다
# Python·brotli 를 끌어들여 얻는 게 없다. 결과물(woff2 · charset.txt)은 커밋한다.
#
# 실행: frontend/ 에서 `sh scripts/fonts/subset-pretendard.sh`
set -euo pipefail

PRETENDARD_VERSION="1.3.9"
SRC_URL="https://cdn.jsdelivr.net/npm/pretendard@${PRETENDARD_VERSION}/dist/web/variable/woff2/PretendardVariable.woff2"

cd "$(dirname "$0")/../.."   # frontend/

VENV="$(mktemp -d)/venv"
ORIGINAL="$(mktemp -d)/PretendardVariable.woff2"
trap 'rm -rf "$(dirname "$VENV")" "$(dirname "$ORIGINAL")"' EXIT

echo "==> 임시 venv 에 fonttools 설치"
python3 -m venv "$VENV"
"$VENV/bin/pip" install --quiet "fonttools[woff]" brotli

echo "==> 원본 내려받기 (pretendard@${PRETENDARD_VERSION})"
curl -sSL -o "$ORIGINAL" "$SRC_URL"

echo "==> 문자 집합 생성"
"$VENV/bin/python" scripts/fonts/build-charset.py > public/fonts/charset.txt

echo "==> 서브셋"
# --layout-features 에서 kern 을 빼면 자간이 달라져 「보이는 것이 같다」가 깨진다(D6).
# --name-IDs='*' 를 빼면 파일 안의 OFL 저작권 문자열이 날아간다(D6).
"$VENV/bin/pyftsubset" "$ORIGINAL" \
  --text-file=public/fonts/charset.txt \
  --layout-features='kern,liga,calt,ccmp,locl,mark,mkmk' \
  --flavor=woff2 --with-zopfli \
  --no-hinting --drop-tables+=DSIG --name-IDs='*' \
  --output-file=public/fonts/PretendardVariable.subset.woff2

echo "==> 내부 family 명 재작성 (OFL Reserved Font Name — D8-5)"
"$VENV/bin/python" scripts/fonts/rename-family.py public/fonts/PretendardVariable.subset.woff2

echo "==> 검증"
"$VENV/bin/python" - <<'PY'
from fontTools.ttLib import TTFont

font = TTFont('public/fonts/PretendardVariable.subset.woff2')
cmap = font.getBestCmap()
axes = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in font['fvar'].axes}
print(f'  cmap  {len(cmap)}자')
print(f'  fvar  {axes}')
assert 'wght' in axes, 'wght 축이 사라졌다 — 가변 폰트가 아니게 됐다'
assert len(cmap) == 2566, f'cmap 이 {len(cmap)}자다 (기대 2566)'
PY

ls -l public/fonts/PretendardVariable.subset.woff2
