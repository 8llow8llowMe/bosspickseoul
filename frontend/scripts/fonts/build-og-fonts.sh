#!/usr/bin/env bash
# 공유 OG 이미지용 정적 폰트(Regular·Bold, WOFF1)를 웹 서브셋에서 뽑는다.
#
# 정본 명세: docs/features/layout/pretendard-subset.md D9.
#
# 웹 서브셋(`subset-pretendard.sh`)을 다시 만든 뒤에만 사람이 1회 돌린다. 결과물
# (`public/fonts/og/*.woff`)은 커밋한다. `OG_FONT_FLAVOR=` 로 비우면 TTF(비교용)를 만든다. CI 에 넣지 않는다.
#
# 실행: frontend/ 에서 `./scripts/fonts/build-og-fonts.sh`
set -euo pipefail

cd "$(dirname "$0")/../.."   # frontend/

VENV="$(mktemp -d)/venv"
trap 'rm -rf "$(dirname "$VENV")"' EXIT

echo "==> 임시 venv 에 fonttools 설치"
python3 -m venv "$VENV"
"$VENV/bin/pip" install --quiet "fonttools[woff]" brotli

echo "==> 정적 인스턴스 생성"
"$VENV/bin/python" scripts/fonts/build-og-fonts.py
