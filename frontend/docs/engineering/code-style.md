# Code Style Rules

## 기본 원칙

- 패키지 매니저는 `pnpm`만 사용한다.
- 포맷은 Prettier 기준으로 맞춘다.
- ESLint는 코드 품질과 잠재 버그 검출에 사용하고, 포맷 논쟁은 Prettier에 맡긴다.
- 한 작업은 PR-sized로 유지한다.
- 기능 이관 중 관련 없는 리팩터링을 섞지 않는다.

## 명령어

가능한 검증 명령:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

문서나 코드 포맷을 실제로 고칠 때만 write 계열 명령을 사용한다. 실행하지 않은 명령은 통과했다고 보고하지 않는다.

`next dev`/`next build`를 돌리면 `next-env.d.ts`의 참조 경로가 `.next/types` ↔ `.next/dev/types` 사이에서 바뀐다. 이는 생성물이라 커밋 대상이 아니다 — 커밋 전 `git checkout -- frontend/next-env.d.ts`로 되돌린다.

## 의존성 추가 기준

- 새 dependency는 기존 도구로 해결할 수 없는 명확한 이유가 있을 때만 추가한다.
- dependency 추가 시 사용 위치, 대체안, bundle/runtime 영향, lockfile 변경을 함께 보고한다.
- 마이그레이션 1차 단계에서는 상태관리, 데이터 패칭, 스타일링 stack 교체를 하지 않는다.

## 파일 변경 기준

- runtime code와 문서 변경을 한 작업에 섞지 않는다. 단, 기능 이관 결과를 inventory에 기록하는 문서 갱신은 허용한다.
- 공통 규칙을 바꾸면 `CLAUDE.md`가 아니라 해당 상세 문서를 우선 갱신한다.
- `CLAUDE.md`는 작업 지도와 문서 navigation 역할로 유지한다.
