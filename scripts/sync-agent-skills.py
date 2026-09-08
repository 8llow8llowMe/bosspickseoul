"""프로젝트 Agent Skills 의 Codex 정본(.agents/skills)과 Claude Code 미러(.claude/skills)를 동기화·검사한다.

.agents/skills/ 에는 OMX(oh-my-codex)가 로컬에 설치하는 스킬이 함께 놓이고 .gitignore 로 무시된다.
그래서 디렉터리 전체를 비교하지 않고, 아래 MIRRORED_SKILLS / HOST_SPECIFIC_SKILLS 목록이 정하는
프로젝트 스킬만 다룬다. 새 스킬을 추가하면 이 목록과 .gitignore 예외에 함께 넣는다.

사용:
    python scripts/sync-agent-skills.py --write   # 정본 → 미러 복사 후 검사
    python scripts/sync-agent-skills.py --check   # 변경 없이 검사만
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
CANONICAL_ROOT = REPOSITORY_ROOT / ".agents" / "skills"
CLAUDE_ROOT = REPOSITORY_ROOT / ".claude" / "skills"
GITIGNORE = REPOSITORY_ROOT / ".gitignore"
UTF8_BOM = b"\xef\xbb\xbf"

# 두 디렉터리가 byte 단위로 같아야 하는 스킬
MIRRORED_SKILLS = (
    "backend-api-check",
    "backend-feature-bootstrap",
    "backend-multi-agent",
    "dev-orchestrator",
    "hexagonal-guard",
    "issue",
    "mr",
    "pr",
)

# 양쪽에 있어야 하지만 내용은 호스트별로 다르게 유지하는 스킬 (툴 이름·프롬프트가 다르다)
HOST_SPECIFIC_SKILLS = (
    "context-handoff",
    "context-resume",
)

ALL_SKILLS = MIRRORED_SKILLS + HOST_SPECIFIC_SKILLS


def relative_files(root: Path, skills: tuple[str, ...]) -> dict[Path, Path]:
    files: dict[Path, Path] = {}
    for skill in skills:
        skill_root = root / skill
        if not skill_root.is_dir():
            continue
        for path in skill_root.rglob("*"):
            if path.is_file() and "__pycache__" not in path.parts:
                files[path.relative_to(root)] = path
    return files


def validate_skill_file(path: Path) -> list[str]:
    errors: list[str] = []
    relative = path.relative_to(REPOSITORY_ROOT)
    raw = path.read_bytes()
    if raw.startswith(UTF8_BOM):
        return [f"UTF-8 BOM is not allowed: {relative}"]
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as error:
        return [f"Invalid UTF-8: {relative}: {error}"]

    frontmatter = re.match(r"\A---\r?\n(.*?)\r?\n---(?:\r?\n|\Z)", text, re.DOTALL)
    if frontmatter is None:
        return [f"Missing YAML frontmatter: {relative}"]

    metadata = frontmatter.group(1)
    name_match = re.search(r"^name:\s*[\"']?([^\"'\r\n]+)[\"']?\s*$", metadata, re.MULTILINE)
    description_match = re.search(r"^description:\s*\S.*$|^description:\s*[|>]", metadata, re.MULTILINE)
    if name_match is None:
        errors.append(f"Missing name: {relative}")
    elif name_match.group(1).strip() != path.parent.name:
        errors.append(
            f"Name does not match directory: {relative}: "
            f"{name_match.group(1).strip()} != {path.parent.name}"
        )
    if description_match is None:
        errors.append(f"Missing description: {relative}")

    for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
        if target.startswith(("http://", "https://", "#")):
            continue
        target_path = (path.parent / target).resolve()
        if not target_path.exists():
            errors.append(f"Broken local link: {relative}: {target}")

    return errors


def validate_skills(root: Path) -> list[str]:
    errors: list[str] = []
    for skill in ALL_SKILLS:
        skill_file = root / skill / "SKILL.md"
        if not skill_file.is_file():
            errors.append(f"Missing SKILL.md: {skill_file.relative_to(REPOSITORY_ROOT)}")
            continue
        errors.extend(validate_skill_file(skill_file))
    return errors


def validate_gitignore() -> list[str]:
    """`.agents/*`, `.claude/*` 를 통째로 무시하므로 스킬마다 예외가 없으면 정본이 로컬에만 남는다."""
    if not GITIGNORE.is_file():
        return [".gitignore not found"]
    lines = {line.strip() for line in GITIGNORE.read_text(encoding="utf-8").splitlines()}
    errors: list[str] = []
    for skill in ALL_SKILLS:
        for root in (".agents/skills", ".claude/skills"):
            for expected in (f"!{root}/{skill}/", f"!{root}/{skill}/SKILL.md"):
                if expected not in lines:
                    errors.append(f".gitignore is missing exception: {expected}")
    return errors


def sync_mirror() -> list[str]:
    source_files = relative_files(CANONICAL_ROOT, MIRRORED_SKILLS)
    destination_files = relative_files(CLAUDE_ROOT, MIRRORED_SKILLS)

    extras = sorted(destination_files.keys() - source_files.keys())
    if extras:
        return [f"Refusing to delete mirror-only file: {path}" for path in extras]

    for relative, source in source_files.items():
        destination = CLAUDE_ROOT / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
    return []


def check_mirror() -> list[str]:
    errors: list[str] = []
    canonical_files = relative_files(CANONICAL_ROOT, MIRRORED_SKILLS)
    claude_files = relative_files(CLAUDE_ROOT, MIRRORED_SKILLS)

    missing = sorted(canonical_files.keys() - claude_files.keys())
    extras = sorted(claude_files.keys() - canonical_files.keys())
    errors.extend(f"Missing Claude mirror file: {path}" for path in missing)
    errors.extend(f"Claude mirror-only file: {path}" for path in extras)

    for relative in sorted(canonical_files.keys() & claude_files.keys()):
        if canonical_files[relative].read_bytes() != claude_files[relative].read_bytes():
            errors.append(f"Mirror content differs: {relative}")
    return errors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Synchronize and validate project Agent Skills mirrors."
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="Copy canonical skills to Claude.")
    mode.add_argument("--check", action="store_true", help="Validate without changing files.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    errors: list[str] = []

    if args.write:
        errors.extend(sync_mirror())

    errors.extend(validate_skills(CANONICAL_ROOT))
    errors.extend(validate_skills(CLAUDE_ROOT))
    errors.extend(check_mirror())
    errors.extend(validate_gitignore())

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print(
        f"Agent Skills OK: {len(MIRRORED_SKILLS)} mirrored, "
        f"{len(HOST_SPECIFIC_SKILLS)} host-specific, UTF-8 and .gitignore validated."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
