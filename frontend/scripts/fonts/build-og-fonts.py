#!/usr/bin/env python3
"""공유 OG 이미지(satori)용 정적 폰트(WOFF1)를 만든다.

정본 명세: docs/features/layout/pretendard-subset.md D9.

satori 는 WOFF2 와 가변 폰트를 읽지 못한다(가변 폰트는 기본 인스턴스 한 굵기로만 그린다).
그래서 이미 커밋된 웹 서브셋(`PretendardVariable.subset.woff2` — 문자 집합 2,566자, family
`BPS Sans` 로 재작성됨)에서 필요한 굵기만 정적 인스턴스로 뽑아 WOFF1 로 저장한다(satori 는 TTF·OTF·WOFF1 을 읽는다). 원본을 다시
내려받지 않으므로 문자 집합과 RFN 재작성이 웹 폰트와 저절로 같다.

OG 이미지에는 합자·문맥 대체가 필요 없고(satori 는 GSUB 대부분을 쓰지 않는다) 숫자 정렬도
한 줄짜리라 필요 없다. 레이아웃 테이블을 빼 용량을 줄인다. 커닝(GPOS kern)은 satori 가 읽으므로 남긴다.

실행: frontend/ 에서 `./scripts/fonts/build-og-fonts.sh`
"""

import os
import sys
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

SOURCE = Path('public/fonts/PretendardVariable.subset.woff2')
OUT_DIR = Path('public/fonts/og')
WEIGHTS = {400: 'Regular', 700: 'Bold'}
EXPECTED_GLYPHS = 2566
# 'woff'(WOFF1, zlib) 또는 None(TTF). 결정 근거는 명세 D9.
FLAVOR = os.environ.get('OG_FONT_FLAVOR', 'woff') or None


def build(weight: int, style_name: str) -> Path:
    font = TTFont(SOURCE)
    static = instantiateVariableFont(font, {'wght': weight}, updateFontNames=False)

    # 레이아웃 기능을 kern 하나로 줄이고 힌팅을 뺀다. 문자 집합(cmap)은 그대로 둔다.
    options = Options()
    options.layout_features = ['kern']
    options.hinting = False
    options.name_IDs = ['*']
    options.notdef_outline = True
    options.drop_tables += ['DSIG', 'STAT']
    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=static.getBestCmap().keys())
    subsetter.subset(static)

    # 정적 인스턴스의 이름을 굵기에 맞춘다(family 는 BPS Sans 그대로).
    #   2 · 17  서브패밀리 / 타이포그래픽 서브패밀리 — 가변 원본의 기본 인스턴스 이름이 남지 않게
    #   3       고유 ID — 두 파일이 같은 값을 갖지 않게 굵기를 붙인다
    #   25      가변 PostScript 접두사 — 정적 폰트에는 의미가 없어 지운다
    for record in static['name'].names:
        if record.nameID in (2, 17):
            record.string = style_name
        elif record.nameID == 3:
            record.string = f'1.309;BPS;BPSSans-{style_name}'
        elif record.nameID == 4:
            record.string = f'BPS Sans {style_name}'
        elif record.nameID == 6:
            record.string = f'BPSSans-{style_name}'
    static['name'].removeNames(nameID=25)
    static['OS/2'].usWeightClass = weight

    static.flavor = FLAVOR
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f'BPSSans-{style_name}.{FLAVOR or "ttf"}'
    static.save(path)

    check = TTFont(path)
    cmap = check.getBestCmap()
    assert 'fvar' not in check, f'{path} 가 아직 가변 폰트다'
    assert len(cmap) == EXPECTED_GLYPHS, f'{path} cmap 이 {len(cmap)}자다 (기대 {EXPECTED_GLYPHS})'
    leaked = [
        r.nameID
        for r in check['name'].names
        if r.nameID not in (0, 7, 9, 13, 14) and 'pretendard' in str(r).lower()
    ]
    assert not leaked, f'nameID {leaked} 에 RFN 이 남아 있다'
    print(f'  {path}  {path.stat().st_size:,} bytes  cmap {len(cmap)}자')
    return path


def main() -> int:
    for weight, style_name in WEIGHTS.items():
        build(weight, style_name)
    return 0


if __name__ == '__main__':
    sys.exit(main())
