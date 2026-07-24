# API contracts

BossPickSeoul 프런트엔드가 참조하는 dev Swagger/OpenAPI 스냅샷입니다.
실행 중인 Swagger가 계약 정본이며, 이 디렉터리는 구현 시점의 비교·리뷰를 위한
로컬 스냅샷입니다.

## 원본

| 서비스    | Swagger UI 선택값      | OpenAPI 원문                                                       |
| --------- | ---------------------- | ------------------------------------------------------------------ |
| 지역/지도 | `지역/지도 서비스 API` | `https://api-dev.bosspickseoul.com/district-service/v3/api-docs`   |
| 인증/회원 | `인증/회원 서비스 API` | `https://api-dev.bosspickseoul.com/auth-service/v3/api-docs`       |
| 상권 분석 | `상권 분석 서비스 API` | `https://api-dev.bosspickseoul.com/commercial-service/v3/api-docs` |
| AI 리포트 | `AI 리포트 서비스 API` | `https://api-dev.bosspickseoul.com/ai-service/v3/api-docs`         |
| 커뮤니티  | `커뮤니티 서비스 API`  | `https://api-dev.bosspickseoul.com/community-service/v3/api-docs`  |

Swagger UI 진입점:
`https://api-dev.bosspickseoul.com/swagger-ui/index.html`

## 파일

- `openapi/*.json`: 서비스별 OpenAPI 3.1 원문
- `openapi/manifest.json`: 수집 시각, 문서 규모, 원문 SHA-256
- `openapi/endpoints.md`: HTTP method/path/요약/인증 여부 인덱스
- `recommendation-migration.md`: 상권 추천 프런트 구현에 필요한 API 흐름과
  dev 데이터 검증 결과

## 갱신

저장소 루트에서 실행합니다.

```bash
node frontend/scripts/sync-openapi.mjs
```

다른 환경의 Swagger를 받을 때:

```bash
BOSSPICK_API_DOCS_URL=https://api.example.com \
  node frontend/scripts/sync-openapi.mjs
```

스냅샷 갱신 후에는 `manifest.json`의 변경과 관련 TypeScript 타입/API 어댑터를
함께 검토합니다. 생성된 JSON을 런타임 번들에 import하지 않습니다.
