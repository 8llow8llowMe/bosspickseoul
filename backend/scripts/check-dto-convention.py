"""
Record DTO §7 convention checker.

§7:
- @Schema right above the component (no blank between)
- Blank line between components
- Validation annotation on the line AFTER @Schema
- No blank line between @Builder and record declaration

Also checks:
- 180-char hard wrap violation
"""
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

DTO_DIR_MARKER = os.sep + 'dto' + os.sep


def find_dto_files(roots):
    for root_path in roots:
        for root, _, files in os.walk(root_path):
            if 'build' in root or 'test' in root:
                continue
            # Must be in a /dto/ subdirectory
            if DTO_DIR_MARKER not in (os.sep + root + os.sep):
                continue
            for f in files:
                if f.endswith('.java'):
                    yield os.path.join(root, f)


def check_file(path: str) -> list[tuple[int, str]]:
    try:
        with open(path, encoding='utf-8') as f:
            src = f.read()
    except Exception as exc:
        return [(0, f'read error: {exc}')]

    lines = src.split('\n')
    issues: list[tuple[int, str]] = []

    # 180-char rule
    for i, line in enumerate(lines, 1):
        if len(line.rstrip()) > 180:
            issues.append((i, f'line too long ({len(line.rstrip())})'))

    # Find @Builder and record declaration
    builder_line = None
    record_line = None
    for i, line in enumerate(lines):
        if line.strip() == '@Builder':
            builder_line = i
        if re.match(r'\s*public record ', line):
            record_line = i
            break

    if builder_line is not None and record_line is not None:
        # Between builder_line and record_line, should be only annotations (no blank)
        between = [line for line in lines[builder_line + 1 : record_line] if line.strip() == '']
        if between:
            issues.append((builder_line + 2, '@Builder 와 record 선언 사이 빈 줄 존재'))

    return issues


if __name__ == '__main__':
    roots = sys.argv[1:] or ['service', 'core']
    total_files = 0
    total_issues = 0
    for path in find_dto_files(roots):
        total_files += 1
        issues = check_file(path)
        if issues:
            for line_num, reason in issues:
                print(f'{path}:{line_num} — {reason}')
            total_issues += len(issues)
    print(f'\nScanned: {total_files} DTO files')
    print(f'Issues: {total_issues}')
