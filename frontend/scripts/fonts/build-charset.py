#!/usr/bin/env python3
"""서브셋에 넣을 문자 집합을 만든다. 결과는 stdout 으로 나온다.

정본 명세: docs/features/layout/pretendard-subset.md D4-1.

집합 = KS X 1001 완성형 한글 2,350자
     ∪ 한글 호환 자모 51자
     ∪ 기본 라틴 95자
     ∪ 추가 기호(아래 EXTRA_SYMBOLS)

KS X 1001 목록을 표로 붙여 넣지 않고 파이썬 표준 코덱으로 판정한다.
euc_kr / cp949 / johab 은 UHC 확장이라 11,172자가 전부 통과하므로 쓰면 안 된다.
iso2022_kr 만 KS X 1001 그대로다.
"""

import sys

# KS X 1001 밖 문자(— 등)도 의도적으로 포함한다. 코드에서 실제로 렌더되기 때문이다.
# 목록 근거는 명세 D4-1 의 `frontend/src` · `frontend/app` 실측 표.
EXTRA_SYMBOLS = (
    '°±·×§©®'
    '–—‘’“”…•'
    '←↑→↓↔'
    '−≈≠≤≥∞'
    '㎡㎝㎞'
    '₩￦'
    '「」『』〈〉《》'
    '！％，：？｜'
    '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
    '○●▲▼✓'
)


def in_ksx1001(ch: str) -> bool:
    try:
        ch.encode('iso2022_kr')
        return True
    except UnicodeEncodeError:
        return False


def main() -> int:
    syllables = [chr(c) for c in range(0xAC00, 0xD7A4) if in_ksx1001(chr(c))]
    # 코덱 동작이 바뀌면 조용히 넘어가지 않고 여기서 깨진다.
    assert len(syllables) == 2350, f'KS X 1001 음절이 {len(syllables)}자다 (기대 2350)'

    jamo = [chr(c) for c in range(0x3131, 0x3164)]
    assert len(jamo) == 51, f'호환 자모가 {len(jamo)}자다 (기대 51)'

    latin = [chr(c) for c in range(0x0020, 0x007F)]
    assert len(latin) == 95, f'기본 라틴이 {len(latin)}자다 (기대 95)'

    chars = sorted(set(syllables) | set(jamo) | set(latin) | set(EXTRA_SYMBOLS))
    sys.stdout.write(''.join(chars))
    print(f'문자 {len(chars)}자', file=sys.stderr)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
