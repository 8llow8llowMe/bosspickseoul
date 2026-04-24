"""
Java class rename helper.

For each (OldName, NewName) pair:
  1. Rename the file (git mv when possible).
  2. Word-boundary substitute OldName -> NewName across all .java files.
  3. Word-boundary substitute oldCamelCase -> newCamelCase (lower-case first char variant)
     — for field and parameter names.
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

RENAMES = [
    # auth-service
    ('MemberBookmarkPort', 'MemberBookmarkRepositoryPort'),
    ('MemberBookmarkPersistenceAdapter', 'MemberBookmarkRepositoryAdapter'),
    # community-service
    ('CommunityCommentLikePort', 'CommunityCommentLikeRepositoryPort'),
    ('CommunityCommentLikePersistenceAdapter', 'CommunityCommentLikeRepositoryAdapter'),
    ('CommunityCommentPort', 'CommunityCommentRepositoryPort'),
    ('CommunityCommentPersistenceAdapter', 'CommunityCommentRepositoryAdapter'),
    ('CommunityPostLikePort', 'CommunityPostLikeRepositoryPort'),
    ('CommunityPostLikePersistenceAdapter', 'CommunityPostLikeRepositoryAdapter'),
    ('CommunityPostPort', 'CommunityPostRepositoryPort'),
    ('CommunityPostPersistenceAdapter', 'CommunityPostRepositoryAdapter'),
    ('CommunityReportPort', 'CommunityReportRepositoryPort'),
    ('CommunityReportPersistenceAdapter', 'CommunityReportRepositoryAdapter'),
    ('CommunityTargetMetaPort', 'CommunityTargetMetaRepositoryPort'),
    ('CommunityTargetMetaPersistenceAdapter', 'CommunityTargetMetaRepositoryAdapter'),
    # batch-service
    ('AreaBoundaryJdbcPort', 'AreaBoundaryBulkPort'),
]


def lc_first(s: str) -> str:
    return s[0].lower() + s[1:] if s else s


def find_file(class_name: str) -> str | None:
    """Locate a .java file containing `public (interface|class|record) ClassName`."""
    target = class_name + '.java'
    for root, _, files in os.walk('.'):
        if 'build' in root or '.git' in root: continue
        if target in files:
            return os.path.join(root, target)
    return None


def git_mv(old: str, new: str) -> bool:
    result = subprocess.run(['git', 'mv', old, new], capture_output=True, text=True)
    if result.returncode == 0:
        return True
    # Fall back to plain rename
    try:
        os.rename(old, new)
        return True
    except OSError:
        return False


def substitute_in_file(path: str, patterns: list[tuple[str, str]]) -> int:
    with open(path, encoding='utf-8') as f:
        src = f.read()
    original = src
    for old, new in patterns:
        src = re.sub(rf'\b{re.escape(old)}\b', new, src)
    if src != original:
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(src)
        return sum(1 for _ in re.finditer('|'.join(rf'\b{re.escape(o)}\b' for o, _ in patterns), original))
    return 0


def main():
    file_moves: list[tuple[str, str]] = []
    patterns: list[tuple[str, str]] = []

    # Build move list and substitution pattern list
    for old_name, new_name in RENAMES:
        src_path = find_file(old_name)
        if src_path is None:
            print(f'WARN: {old_name}.java not found')
            continue
        dst_path = os.path.join(os.path.dirname(src_path), new_name + '.java')
        file_moves.append((src_path, dst_path))
        patterns.append((old_name, new_name))
        patterns.append((lc_first(old_name), lc_first(new_name)))

    # 1. Move files
    print(f'\n== Phase 1: rename {len(file_moves)} files ==')
    for old_path, new_path in file_moves:
        if git_mv(old_path, new_path):
            print(f'  moved {os.path.basename(old_path)} -> {os.path.basename(new_path)}')
        else:
            print(f'  FAIL {old_path} -> {new_path}')

    # 2. Substitute across entire project
    print(f'\n== Phase 2: substitute in .java files ==')
    total_changes = 0
    total_files_touched = 0
    for root, _, files in os.walk('.'):
        if 'build' in root or '.git' in root: continue
        for f in files:
            if not f.endswith('.java'): continue
            path = os.path.join(root, f)
            changes = substitute_in_file(path, patterns)
            if changes:
                total_changes += changes
                total_files_touched += 1

    print(f'\nTotal: {total_changes} substitutions in {total_files_touched} files')


if __name__ == '__main__':
    main()
