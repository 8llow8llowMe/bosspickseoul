"""
Controller Swagger 파라미터 병합.

변환:
    @Parameter(description = "~~", required = true, example = "126.90")
    @RequestParam double lngSW,

→

    @Parameter(description = "~~", required = true, example = "126.90") @RequestParam double lngSW,

180자 이내에 들어갈 때만 합친다. @Min/@Max 같은 validation annotation 이 끼여있으면 건드리지 않는다.
"""
import os
import re
import sys

MAX_LINE = 180

# @Parameter(...) 한 줄 + 다음 줄에 @RequestParam/@PathVariable/@RequestBody 로 시작하는 변수 선언
PATTERN = re.compile(
    r'^(?P<indent>\s+)(?P<param>@Parameter\([^\n]+\))\n'
    r'(?P=indent)(?P<decl>@(?:RequestParam|PathVariable|RequestBody)[^\n]+?)\s*$',
    re.MULTILINE,
)


def process_file(path: str) -> int:
    with open(path, encoding='utf-8') as f:
        content = f.read()

    def repl(m):
        indent = m.group('indent')
        param = m.group('param')
        decl = m.group('decl')
        merged = f'{indent}{param} {decl}'
        if len(merged) <= MAX_LINE:
            return merged
        return m.group(0)

    new_content = PATTERN.sub(repl, content)
    if new_content != content:
        changes = content.count('\n') - new_content.count('\n')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return changes
    return 0


if __name__ == '__main__':
    targets: list[str] = []
    if sys.argv[1:]:
        for arg in sys.argv[1:]:
            if os.path.isdir(arg):
                for root, _, files in os.walk(arg):
                    if 'build' in root or 'test' in root:
                        continue
                    for f in files:
                        if f.endswith('Controller.java'):
                            targets.append(os.path.join(root, f))
            else:
                targets.append(arg)
    else:
        for root, _, files in os.walk('service'):
            if 'build' in root or 'test' in root:
                continue
            for f in files:
                if f.endswith('Controller.java'):
                    targets.append(os.path.join(root, f))

    total = 0
    for t in targets:
        try:
            n = process_file(t)
        except Exception as exc:
            print(f'ERROR {t}: {exc}')
            continue
        if n:
            print(f'{n:3d} lines merged: {t}')
            total += n
    print(f'\nTOTAL lines merged: {total}')
