---
name: mr
description: "Create a Merge Request draft in the BossPickSeoul Korean template. Use when the user invokes /mr, $mr, asks for an MR body, merge request template, MR description, or wants a title like [BE] feat: ... with 작업 내용, 타입, MR 체크리스트, 검증 내역, 참고 사항, and 연관 이슈."
---

# MR Draft

BossPickSeoul Merge Request 본문과 제목을 한국어 템플릿으로 작성한다.

## Workflow

1. 변경 범위를 확인한다.
   - 가능하면 `git status`, `git diff --stat`, `git log --oneline` 기준으로 요약한다.
   - 사용자가 이미 작업 내용을 제공했다면 제공 내용을 우선한다.
2. 제목을 만든다.
   - 형식: `[영역] type: 요약`
   - 영역 예시: `[BE]`, `[FE]`, `[INFRA]`, `[DOCS]`
   - type 예시: `feat`, `fix`, `chore`, `refactor`, `style`, `docs`, `test`
3. 본문은 바로 복사 가능한 Markdown으로만 출력한다.
4. 실제로 확인하지 않은 항목은 체크하지 않는다.
5. 이슈 번호가 없으면 `Issue Number: #` 형태로 비워둔다.

## Output Template

```markdown
## 📝 작업 내용

[작업 내용을 2~4문장으로 요약]

### 주요 변경 사항

1. [주요 변경 1]
2. [주요 변경 2]
3. [주요 변경 3]

## 타입

- [ ] feat: 새로운 기능 추가
- [ ] fix: 버그 수정
- [ ] chore: 빌드 업무 수정, 패키지 매니저 수정
- [ ] refactor: 코드 리펙토링
- [ ] style: 코드 포맷팅, 세미콜론 누락, 코드 변경이 없는 경우
- [ ] docs: 문서 수정
- [ ] test: 테스트 코드, 리펙토링 테스트 코드 추가

## MR 하기 전에 확인해주세요

- [ ] 코딩 컨벤션을 지켰나요?
- [ ] local ci test를 진행하셨나요?
- [ ] 팀원들에게 공지하셨나요?

## 검증 내역

- [검증 명령 또는 확인 내용]

## 참고 사항

- [리뷰어가 알아야 할 점]

## 연관된 이슈

Issue Number: #
```

## Style Rules

- 제목과 본문은 한국어로 쓴다.
- 작업 내용은 기능 단위로 묶고, 파일 나열식 changelog를 피한다.
- 여러 이슈를 묶을 때는 `#25`, `#26`처럼 각 섹션 제목이나 연관 이슈에 표시한다.
- 검증 내역에는 성공/실패 여부를 숨기지 않는다.
- 보안값, token, private key, DB password는 절대 포함하지 않는다.
