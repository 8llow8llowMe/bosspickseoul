---
name: issue
description: "Create a GitHub issue draft using the BossPickSeoul Korean feature issue template. Use when the user invokes /issue, $issue, asks for an issue template, feature issue, bug issue draft, or wants a title like [BE] feat: ... with 기능 설명, 작업 상세 내용, and 참고 자료."
---

# Issue Draft

BossPickSeoul 이슈 초안을 한국어 템플릿으로 작성한다.

## Workflow

1. 이슈 종류를 판단한다.
   - 기본은 기능 이슈다.
   - 버그/문서/인프라 이슈가 더 적절하면 제목 type만 조정한다.
2. 제목을 만든다.
   - 형식: `[영역] type: 요약`
   - 예시: `[BE] feat: 회원 북마크 시스템 구현`
3. 본문은 GitHub issue body에 바로 붙여넣을 수 있는 Markdown으로 출력한다.
4. GitHub issue template 파일을 만들라는 요청이 아니면 YAML frontmatter는 포함하지 않는다.
5. 할 일은 체크박스 형태로 2~6개 작성한다.
6. 같은 범위의 이슈가 이미 있으면 새로 만들지 않고 그 번호를 쓴다.
7. GitHub에 생성할 때도 **라벨을 붙이지 않는다.** `gh issue create`에 `--label`을 넣지 않고, API/`labels` 필드도 비운다. Cursor·Codex·Claude Code 모두 같다. 라벨은 사람이 이후에 단다.

## Body Template

```markdown
## 어떤 기능인가요? ✏

- [추가하려는 기능을 간결하게 설명]

## 작업 상세 내용 📝

- [ ] [해야 할 일]
- [ ] [해야 할 일]
- [ ] [해야 할 일]

## 참고할만한 자료(선택)

- [참고 자료 또는 관련 맥락]
```

## GitHub Issue Template File

사용자가 `.github/ISSUE_TEMPLATE`에 넣을 템플릿 파일을 요청하면 아래 형식을 사용한다.
아래 YAML의 `labels`/`assignees`는 GitHub 템플릿 필드일 뿐이고, 이슈를 만들 때 에이전트가 값을 채우지 않는다.

```markdown
---
name: 기능 이슈 생성 템플릿
about: 해당 기능 이슈 생성 템플릿을 사용하여 기능 관련 이슈를 생성해주세요.
title: ''
labels: ''
assignees: ''
---

## 어떤 기능인가요? ✏

- 추가하려는 기능에 대해 간결하게 설명해주세요

## 작업 상세 내용 📝

- [ ] 해야할 일
- [ ] 해야할 일

## 참고할만한 자료(선택)
```

## Style Rules

- 한국어로 작성한다.
- 작업 범위가 너무 크면 기능을 나누는 제안을 먼저 한다.
- 제목은 `[BE] feat: ...`, `[INFRA] chore: ...`, `[DOCS] docs: ...` 형식을 우선한다.
- GitHub 라벨을 설정하지 않는다. `--label`, frontmatter `labels`, 웹 UI 라벨을 에이전트가 채우지 않는다.
- 보안값, token, private key, DB password는 절대 포함하지 않는다.
