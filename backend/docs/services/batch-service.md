# 분기 데이터 적재

## 구현 범위와 호환성 결정

`quarterly` 프로파일의 `commercialAnalysisImportJob`은 데이터셋·분기 한 건을 실행 단위로 삼는다. 스케줄러는 데이터셋별 제공 여부를 확인해 같은 Job을 반복 실행한다. CSV/ZIP 백필과 서울 Open API 수집을 동일한 검증·게시 경로로 처리한다.

원본 보관 → chunk staging → 자연키/필수값/분기/공간 코드 검증 → 불변 release 게시 → 해당 데이터셋·분기·공간 버전 포인터 전환 순서다. 게시 트랜잭션은 분기 전체를 교체하며 이전 release를 삭제하지 않는다. 같은 runId 재시도는 staging부터 다시 읽고, 이미 게시된 runId는 변경하지 않는다.

기존 `20233` 분석 테이블, `commercial_region_mapping`, `area_boundary`는 이 배치가 수정하지 않는다. 현재 서비스는 공간 버전 없는 조인과 같은 코드의 분기 간 증감률을 사용한다. 따라서 새 기준 데이터를 기존 테이블에 바로 게시하는 것은 과거 데이터 보존과 양립하지 않는다. 새 데이터는 `dataset_release`, `dataset_fact`, `dataset_active_release`, `dataset_spatial_*`에서 조회할 수 있게 보관한다. 서비스 노출 전에는 지도/지역/추세 조회를 공간 버전 기준으로 전환해야 한다. 원천의 재공표로 과거 분기도 새 공간 기준을 사용할 수 있으므로 연도만으로 기준을 추정하지 않는다.

## 책임과 검증 계획

- 수집 Adapter: API 페이지 제한, 타임아웃, 오류 응답, 원본 checksum, UTF-8/CP949 CSV 및 ZIP 스트리밍 검증.
- Application: 분기 형식, 데이터셋 계약, 누락과 0 구분, 원천 스키마 변경 실패, 공간 버전 연결 검증.
- Persistence Adapter: staging chunk 저장, 중복과 공간 코드 검증, 게시 트랜잭션, 게시 동시성 및 불변 이력 검증.
- 실행 구성: 기본 dryRun, 명시 DB URL와 schema allowlist, Job 종료 코드, 외부 스케줄러 실행 안내.

추가 라이브러리 없이 기존 Spring Batch/JDBC/Jackson/JUnit을 사용한다. 실제 개발 DB 변경과 공공 API 키 사용은 이번 로컬 구현·테스트에 포함하지 않는다.
