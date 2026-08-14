# Frontend Docs

BossPickSeoul FE 문서 인덱스. 작업 지도는 `../CLAUDE.md`.

## 정본

- `features/` — Feature 기준 명세(정본). 시작점: `features/_index.md`
- `../DESIGN.md` — 디자인 시스템 정본
- `engineering/` — 횡단 기술 규칙 (명세가 참조)
- `api/` — dev Swagger/OpenAPI 스냅샷과 FE API 마이그레이션 검토

## 보조

- `runbook/` — 실행·운영: migration / qa / cutover / seo / deployment
- `superpowers/` — specs(설계서) / plans(실행 계획)
- `_archive/` — 통폐합 전 원문 보관 (참조 전용, 정본 아님)

## 프로세스

설계·구현은 superpowers를 따른다(brainstorming → writing-plans → executing → review).
자세한 규칙은 `../CLAUDE.md` 참조.

## 명세 형식

`../_DocumentTemplates` (공통 S0~S5 → 세부 D0~D8, 2계층. 플랫폼명세 미사용).
