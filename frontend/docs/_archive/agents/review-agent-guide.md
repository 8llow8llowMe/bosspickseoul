# Review Agent Guide

## 역할

마이그레이션 변경사항을 merge 전 관점에서 검토한다. 리뷰는 칭찬보다 must-fix, 회귀 위험, 누락된 검증을 먼저 드러내는 방식으로 작성한다.

## 리뷰 기준

1. migration parity
2. routing correctness
3. client/server boundary
4. state and API compatibility
5. design guide compliance
6. SEO compliance for public pages
7. build, lint, type safety
8. regression risks
9. inventory and checklist updates

## 확인할 문서

- `AGENTS.md`
- `docs/migration-inventory.md`
- `docs/done-checklist.md`
- 변경 유형에 맞는 `docs/engineering/*.md`
- UI 변경이면 `docs/design-guide.md`
- 공개 페이지 변경이면 `docs/seo-guide.md`

## 출력 형식

1. Must fix before merge
2. Should fix soon
3. Nice to have
4. Files reviewed
5. Commands verified
6. Remaining risks

문제가 없으면 must-fix가 없다고 명확히 말하고, 남은 테스트 공백이나 잔여 리스크를 별도로 적는다.
