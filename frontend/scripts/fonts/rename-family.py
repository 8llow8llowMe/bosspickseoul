#!/usr/bin/env python3
"""서브셋 폰트의 내부 family 명을 RFN 이 아닌 이름으로 재작성한다.

정본 명세: docs/features/layout/pretendard-subset.md D8-5.

Pretendard 는 OFL 에 Reserved Font Name "Pretendard" 를 선언한다.

    Copyright (c) 2021, Kil Hyung-jin, with Reserved Font Name Pretendard.

글리프를 지운 서브셋은 OFL 1.1 조항 3 의 Modified Version 이므로 RFN 을 주
폰트명으로 쓸 수 없다. 조항이 「사용자에게 제시되는 주 폰트명」에만 적용된다는
단서를 달고 있고 next/font 가 CSS family 명을 따로 생성하기는 하지만, 파일을
추출해 설치하면 내부 이름이 그대로 노출되므로 안전한 쪽을 택한다.

저작권·라이선스 문자열(nameID 0 · 13 · 14)은 건드리지 않는다. OFL 파생물 고지가
파일 안에 남아 있어야 한다.
"""

import sys

from fontTools.ttLib import TTFont

FAMILY = 'BPS Sans'
PS_NAME = 'BPSSans-Regular'
PS_PREFIX = 'BPSSans'

# 식별 이름만 바꾼다. 저작권(0) · 상표 고지(7) · 디자이너 귀속(9) · 라이선스(13 · 14)
# 는 원저작자 표기이므로 건드리지 않는다. 상표 고지에 "Pretendard is a trademark of
# Kil Hyung-jin" 이 남는 것은 RFN 을 폰트 이름으로 쓰는 것이 아니라 요구되는 귀속이다.
ATTRIBUTION_IDS = (0, 7, 9, 13, 14)

NEW_VALUES = {
    1: FAMILY,  # Family
    3: f'1.309;BPS;{PS_PREFIX}',  # Unique ID
    4: FAMILY,  # Full name
    6: PS_NAME,  # PostScript name
    16: FAMILY,  # Typographic family
    25: PS_PREFIX,  # Variable PostScript name prefix
}

ORIGINAL_PS_PREFIX = 'PretendardVariable'


def main(path: str) -> int:
    font = TTFont(path)

    # 가변 인스턴스(Thin · Light · Bold …)의 PostScript 이름도 사용자에게 제시되는
    # 폰트 이름이다. ID 를 박지 않고 fvar 에서 찾아 접두사만 바꾼다.
    instance_ps_ids = {
        instance.postscriptNameID
        for instance in font['fvar'].instances
        if instance.postscriptNameID not in (0, 0xFFFF)
    }

    for record in font['name'].names:
        if record.nameID in NEW_VALUES:
            record.string = NEW_VALUES[record.nameID]
        elif record.nameID in instance_ps_ids:
            record.string = str(record).replace(ORIGINAL_PS_PREFIX, PS_PREFIX)

    # RFN 이 이름 자리에 남지 않았는지 확인한다.
    leaked = [
        r.nameID
        for r in font['name'].names
        if r.nameID not in ATTRIBUTION_IDS and 'pretendard' in str(r).lower()
    ]
    assert not leaked, f'nameID {leaked} 에 RFN 이 남아 있다'

    font.flavor = 'woff2'
    font.save(path)
    print(f'  family -> {FAMILY} (인스턴스 {len(instance_ps_ids)}개 포함)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1]))
