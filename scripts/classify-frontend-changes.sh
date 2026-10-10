#!/usr/bin/env sh
#
# 변경 파일 목록을 보고 프론트엔드 검사를 얼마나 돌릴지 정한다 (#497).
#
# `.github/workflows/frontend-ci.yml` 의 `changes` 잡이 쓴다. 기준을 이 파일 한 곳에 둔다.
#
# 입력(stdin): 저장소 루트 기준 경로, 한 줄에 하나
# 출력(stdout): 셋 중 하나
#   code — 아래 docs 가 아닌 `frontend/` 파일, 또는 이 판정에 쓰이는 파일이 바뀌었다 → `verify` 전부 + `e2e`
#   docs — `frontend/docs/**` 와 그 밖의 문서(`.md`)만 바뀌었다 → `verify` 는 `format:check` 만, `e2e` 는 skipped
#   none — 프론트엔드와 무관하다(BE 전용·다른 워크플로·루트 문서) → `verify` · `e2e` 모두 skipped
#
# `verify` · `e2e` 는 develop 의 필수 체크다. skipped 는 통과로 친다. 그래서 `none` 으로 잘못 가르면 검사 없이
# 머지된다 — 애매한 경로는 `code` 쪽으로 판정한다.
#
# **`src/` · `app/` · `public/` 아래 `.md` 는 `code` 다.** 테스트가 이 세 트리의 `.md` 까지 읽어
# 금지 색을 찾는다(`src/styles/global-styles.test.ts`). 테스트가 읽는 문서가 늘면 여기에 더한다.
#
# **문서만 바뀌어도 `format:check` 는 남긴다.** `.md` 도 prettier 대상이다.
#
# 실행:
#   git -c core.quotepath=off diff --name-only origin/develop...HEAD | sh scripts/classify-frontend-changes.sh
#
# **`core.quotepath=off` 를 꼭 준다.** 기본값이면 git 이 한글 경로를 `"frontend/docs/\354..."` 처럼
# 따옴표로 감싸 내보내 아래 패턴에 걸리지 않는다. 그렇게 들어온 경로는 무엇인지 모르므로 `code` 로 본다.

set -e

kind=none
# 마지막 줄에 줄바꿈이 없어도 읽는다 — `printf %s` 로 넘기면 끝 줄이 버려진다
while IFS= read -r path || [ -n "$path" ]; do
  # case 의 `*` 는 `/` 도 넘는다. 그래서 위에서부터 먼저 맞는 패턴이 이긴다.
  case "$path" in
    .github/workflows/frontend-ci.yml | scripts/classify-frontend-changes.sh)
      kind=code
      ;;
    frontend/src/* | frontend/app/* | frontend/public/*)
      kind=code
      ;;
    frontend/docs/* | frontend/*.md)
      if [ "$kind" = none ]; then kind=docs; fi
      ;;
    frontend/* | \"frontend/*)
      kind=code
      ;;
  esac
done

echo "$kind"
