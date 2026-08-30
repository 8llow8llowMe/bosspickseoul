---
name: context-handoff
description: |
  현재 대화의 작업 상태를 인계 문서로 저장한다. 컨택스트가 차서 새 대화로
  넘어가기 전, 또는 다른 기기에서 이어가기 전에 사용. /context-resume 와 짝.
  트리거: "context handoff", "핸드오프", "인계 저장", "작업 저장".
allowed-tools:
  - Bash
  - Read
  - Write
---

# /context-handoff — 작업 상태 인계 저장

당신은 **꼼꼼히 세션 노트를 남기는 시니어 엔지니어**다. 현재 대화의 작업
맥락(무엇을 하고 있었나 / 내린 결정 / 남은 작업 / 주의사항)을 markdown 문서로
저장해, 새 대화나 다른 기기에서 `/context-resume`로 이어갈 수 있게 한다.

**HARD GATE: 코드를 절대 수정하지 않는다. 상태를 읽고 문서만 쓴다.**

## 문서는 저장소 안에 쌓인다

인계 문서는 **저장소의 `docs/handoffs/`** 에 쓴다. `$HOME` 이 아니라 저장소인 이유는 둘이다.

1. **기기 간 이어짐.** git 으로 따라가므로 집 컴퓨터에서 `git pull` 하면 그대로 읽힌다.
   `$HOME` 에 두면 문서가 그 기기에만 남는다.
2. **워크트리 간 이어짐.** 예전에는 `basename $PWD` 로 폴더를 갈랐는데, 이 저장소는
   워크트리를 여러 개 쓰기 때문에 같은 프로젝트의 인계가 `bosspick-polygon`·`nowdoboss`
   처럼 **서로 다른 폴더로 흩어졌다.** 저장소 경로는 어느 워크트리에서 실행해도 같은 곳을
   가리킨다.

**문서를 쓴 뒤 커밋까지 해야 다른 기기에서 보인다.** Step 3 에서 안내한다.

git 저장소가 아닌 곳에서 실행하면 예전처럼 `$HOME/.claude/handoffs/<폴더명>` 으로 떨어진다.

## Step 1: 경로와 상태 수집 (bash)

**제목을 셸 명령에 인라인으로 절대 넣지 않는다.** 원본 제목(한글 포함, 백틱/`$()`/따옴표
등 임의의 문자를 포함할 수 있음)을 아래 bash 실행 **전에** Write 툴로 임시 파일
`${TMPDIR:-/tmp}/context-handoff-title.$$`에 그대로 기록한다. `$$`는 이 스킬을 실행하는
셸의 PID로 치환해 실제 경로를 만든다. `/context-handoff` 뒤에 제목이 없으면 작업에서
추론한 제목을 같은 방식으로 파일에 쓴다. 이렇게 하면 bash 블록은 파일을 읽기만 하고
제목 문자열을 명령 조립에 절대 사용하지 않으므로 셸 인젝션이 불가능하다.

```bash
# 제목은 셸에 인라인으로 넣지 않는다. Write 툴로 먼저 임시 파일에 원본 제목을 쓴 뒤
# 여기서 읽는다 — 셸 메타문자 주입 방지. 제목이 없으면 untitled.
ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -n "$ROOT" ]; then
  # 저장소 경로. 어느 워크트리·하위 폴더에서 실행해도 같은 곳을 가리킨다.
  PROJECT=$(basename "$ROOT")
  HANDOFF_DIR="$ROOT/docs/handoffs"
  IN_REPO=1
else
  # git 저장소가 아니면 예전처럼 홈으로 (이때는 기기 간에 따라가지 않는다)
  PROJECT=$(basename "$PWD")
  HANDOFF_DIR="$HOME/.claude/handoffs/$PROJECT"
  IN_REPO=0
fi
mkdir -p "$HANDOFF_DIR"
TS=$(date +%Y-%m-%d-%H%M%S)
TITLE_FILE="${TMPDIR:-/tmp}/context-handoff-title.$$"   # 이 bash 실행 전에 Write 툴로 원본 제목 기록
RAW="$(cat "$TITLE_FILE" 2>/dev/null || echo untitled)"
rm -f "$TITLE_FILE"
SLUG=$(printf '%s' "$RAW" | tr '[:upper:]' '[:lower:]' | tr -s ' \t' '-' | tr -cd 'a-z0-9.-' | cut -c1-50)
SLUG="${SLUG:-untitled}"
FILE="$HANDOFF_DIR/${TS}-${SLUG}.md"
[ -e "$FILE" ] && FILE="$HANDOFF_DIR/${TS}-${SLUG}-$$.md"
echo "PROJECT=$PROJECT"; echo "CWD=$PWD"; echo "FILE=$FILE"
echo "RAW_TITLE=$RAW"; echo "IN_REPO=$IN_REPO"
echo "=== GIT (없으면 무시) ==="
git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "none"
git status --short 2>/dev/null
git diff --stat 2>/dev/null
git log --oneline -8 2>/dev/null
```

git 명령이 아무것도 출력하지 않으면(=git 저장소 아님) 관련 필드는 `none`으로 둔다.
출력된 `RAW_TITLE`이 Step 2 frontmatter의 `title:` 필드와 `## 작업 주제:` 제목에
그대로(한글 포함) 사용할 원본 제목이다.

## Step 2: 인계 문서 작성

위에서 출력된 `FILE` 경로(정확히 그 문자열)에 Write 툴로 아래 형식의 문서를 쓴다.
`files` 목록은 `git status --short`의 파일들(있으면), 없으면 이번 대화에서 수정/생성한
파일들을 적는다.

```markdown
---
project: {PROJECT}
cwd: {CWD}
branch: {브랜치 또는 none}
timestamp: {ISO-8601, 예: 2026-08-06T14:30:00+09:00}
title: {원본 제목 — 한글 그대로}
files:
  - {수정된 파일 경로}
---

## 작업 주제: {제목}

### 요약

{무엇을 하고 있었는지 1-3문장. 높은 수준의 목표와 현재 진척.}

### 내린 결정

{아키텍처 선택, 트레이드오프, 채택한 접근과 그 이유. 불릿.}

### 남은 작업

{우선순위 순 번호 목록. 구체적인 다음 단계.}

### 주의사항

{함정, 막힌 부분, 시도했다 실패한 것, 열린 질문.}
```

**저장소에 커밋되는 문서다.** 자격증명·토큰·개인정보를 적지 않는다. 임시 절대 경로
(`/tmp/...`)를 적을 때는 그것이 재부팅하면 사라진다는 것도 함께 적는다.

## Step 3: 확인 출력

문서를 쓴 뒤 사용자에게 알린다. `IN_REPO=1`이면 **커밋 안내를 반드시 함께 낸다** —
커밋하지 않으면 다른 기기에서 보이지 않는다.

```
✅ 인계 저장 완료
────────────────────────────
제목:   {제목}
프로젝트: {PROJECT}
파일:   {FILE}
파일수:  {N}개 수정
────────────────────────────
다른 기기에서 이어가려면 커밋·푸시가 필요합니다:
  git add docs/handoffs && git commit -m "docs: 인계 — {제목}" && git push

새 대화에서 /context-resume 로 이어가세요.
```

커밋은 **사용자가 원할 때만** 한다. 묻지 않고 대신 커밋하지 않는다.

## 규칙

- 코드 수정 금지. 읽기 + 문서 쓰기만.
- 인계 문서는 append-only. 기존 파일 덮어쓰기·삭제 금지.
- 추론 우선, 심문 금지. git 상태와 대화 맥락으로 채운다. 제목을 도저히 못 정할 때만 질문.
