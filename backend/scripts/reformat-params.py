"""
Java method parameter reformatter — 180자 기준.

우선순위:
1. 전체가 180자 이내로 한 줄에 들어가면 단일 라인으로
2. 못 들어가면 의미 가까운 파라미터끼리 180자 이내 묶음으로 팩킹
"""
import os
import re
import sys

MAX_LINE = 180
TARGET_LINE = 170

SIG_PATTERN = re.compile(
    r'^(?P<indent>\s+)(?P<sig>(?:public|private|protected)\s[^\n(]+?\()\n'
    r'(?P<params>(?:\s+[^\n]+,\n)+\s+[^\n]+\n)'
    r'(?P<close>\s+\)\s*(?:throws\s[\w, ]+)?\s*\{?)',
    re.MULTILINE,
)


def single_line_fits(indent: str, sig: str, params: list[str], close: str) -> str | None:
    joined = ', '.join(params)
    single = f'{indent}{sig}{joined}{close.strip()}'
    return single + '\n' if len(single) <= MAX_LINE else None


def pack_multiline(indent: str, params: list[str]) -> str:
    inner_indent = indent + '    '
    lines = []
    current = []

    def flush():
        if current:
            lines.append(f'{inner_indent}{", ".join(current)}')

    for param in params:
        trial = current + [param]
        trial_line = f'{inner_indent}{", ".join(trial)}'
        if len(trial_line) <= TARGET_LINE:
            current.append(param)
        else:
            flush()
            current = [param]
    flush()

    return ',\n'.join(lines) + '\n'


def process_file(path: str) -> int:
    with open(path, encoding='utf-8') as f:
        content = f.read()

    changes = 0

    def repl(m):
        nonlocal changes
        indent = m.group('indent')
        sig = m.group('sig')
        params_block = m.group('params')
        close = m.group('close')

        raw_params = [p.strip().rstrip(',').strip() for p in params_block.strip().split('\n')]
        raw_params = [p for p in raw_params if p]
        if len(raw_params) < 2:
            return m.group(0)

        single = single_line_fits(indent, sig, raw_params, close)
        if single is not None:
            changes += 1
            return single

        packed = pack_multiline(indent, raw_params)
        new_block = f'{indent}{sig}\n{packed}{close}'
        if new_block == m.group(0):
            return m.group(0)
        changes += 1
        return new_block

    new_content = SIG_PATTERN.sub(repl, content)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
    return changes


if __name__ == '__main__':
    targets: list[str] = []
    if sys.argv[1:]:
        for arg in sys.argv[1:]:
            if os.path.isdir(arg):
                for root, _, files in os.walk(arg):
                    if 'build' in root or 'test' in root:
                        continue
                    for f in files:
                        if f.endswith('.java'):
                            targets.append(os.path.join(root, f))
            else:
                targets.append(arg)
    else:
        for root, _, files in os.walk('service'):
            if 'build' in root or 'test' in root:
                continue
            for f in files:
                if f.endswith('.java'):
                    targets.append(os.path.join(root, f))

    total = 0
    for t in targets:
        try:
            n = process_file(t)
        except Exception as exc:
            print(f'ERROR {t}: {exc}')
            continue
        if n:
            print(f'{n:3d} methods: {t}')
            total += n
    print(f'\nTOTAL methods reformatted: {total}')
