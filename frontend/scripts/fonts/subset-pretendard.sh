#!/usr/bin/env bash
# Pretendard 원본 가변 폰트를 서비스가 쓰는 문자만 남긴 서브셋으로 만든다.
#
# 정본 명세: docs/features/layout/pretendard-subset.md D4-2.
#
# 폰트 버전을 올릴 때만 사람이 1회 돌린다(D8-7). CI 에 넣지 않는다 — 빌드마다
# Python·brotli 를 끌어들여 얻는 게 없다. 결과물(woff2 · charset.txt)은 커밋한다.
#
# 실행: frontend/ 에서 `./scripts/fonts/subset-pretendard.sh`
#       (`set -o pipefail` 을 쓰므로 dash 인 `sh` 로 돌리면 실패한다)
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
# --layout-features 는 기본 세트를 「대체」한다. 목록에 없는 feature 는 통째로 사라지므로
# 화면이 쓰는 것을 전부 적어야 한다(D6).
#   kern  — 빼면 자간이 달라져 「보이는 것이 같다」가 깨진다.
#   tnum  — 빼면 font-variant-numeric: tabular-nums 가 no-op 이 된다. Pretendard 의 기본
#           숫자는 비례폭(1=898, 4=1278)이라 비교표·금액 열의 자릿수 정렬이 무너진다.
# --name-IDs='*' 를 빼면 파일 안의 OFL 저작권 문자열이 날아간다(D6).
"$VENV/bin/pyftsubset" "$ORIGINAL" \
  --text-file=public/fonts/charset.txt \
  --layout-features='kern,liga,calt,ccmp,locl,mark,mkmk,tnum' \
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

# --layout-features 를 잘못 건드리면 렌더가 조용히 달라진다. cmap 수만 보던 검증으로는
# tnum 유실을 놓쳤다(#328 리뷰). feature 존재와 실제 치환 결과를 함께 단언한다.
gsub = {r.FeatureTag for r in font['GSUB'].table.FeatureList.FeatureRecord}
gpos = {r.FeatureTag for r in font['GPOS'].table.FeatureList.FeatureRecord}
print(f'  GSUB  {",".join(sorted(gsub))}')
print(f'  GPOS  {",".join(sorted(gpos))}')
for tag, table in (('tnum', gsub), ('calt', gsub), ('locl', gsub), ('kern', gpos)):
    assert tag in table, f'{tag} feature 가 사라졌다 — --layout-features 를 확인하라'

# tnum 이 목록에 있어도 실제로 숫자를 균일폭 글리프로 바꾸는지까지 본다.
tnum_map = {}
for record in font['GSUB'].table.FeatureList.FeatureRecord:
    if record.FeatureTag != 'tnum':
        continue
    for lookup_index in record.Feature.LookupListIndex:
        for sub in font['GSUB'].table.LookupList.Lookup[lookup_index].SubTable:
            tnum_map.update(getattr(sub, 'mapping', {}))
digits = [cmap[ord(d)] for d in '0123456789']
widths = {font['hmtx'][tnum_map.get(g, g)][0] for g in digits}
print(f'  tnum 숫자 advance  {widths}')
assert len(widths) == 1, f'tnum 을 적용해도 숫자 폭이 제각각이다: {widths}'
PY

ls -l public/fonts/PretendardVariable.subset.woff2
