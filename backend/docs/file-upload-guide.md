# File Upload Guide (MinIO)

파일 업로드 계약을 정리한다. 스토리지는 storage 서버(192.168.0.12)의 MinIO 이고,
공통 클라이언트는 `core:storage-core` 에 있다.

## 설계 원칙

| 원칙 | 이유 |
| --- | --- |
| **DB 에는 URL 이 아니라 오브젝트 키를 저장** | 엔드포인트/도메인/CDN 이 바뀌어도 데이터 마이그레이션이 필요 없다. URL 조립은 Presenter 책임 |
| **키는 전적으로 서버가 생성** (`{prefix}/{memberId}/{yyyy}/{MM}/{uuid}.{ext}`) | 원본 파일명을 키에 섞지 않아 경로 조작·URL 인코딩 깨짐·컬럼 오버플로우가 원천 차단된다 |
| **형식 판정은 매직 바이트로만** | 확장자와 클라이언트 `Content-Type` 은 위조 가능. 공개 버킷에 `text/html`/`svg` 를 올려 stored XSS 를 만드는 경로를 막는다 |
| **키에 memberId 를 포함** | 클라이언트가 보낸 키를 리소스에 연결할 때 "내가 올린 파일인가"를 서버가 검증할 수 있다 |
| **원격 I/O 는 트랜잭션 밖에서** | DB 커넥션을 잡은 채 대기하지 않는다 |
| **삭제는 커밋 이후에** | 롤백됐는데 파일만 사라진 상태를 만들지 않는다 |

## API

| API | 인증 | 용도 |
| --- | --- | --- |
| `POST /api/v1/members/me/profile-image` (multipart, `imageFile`) | 필수 | 프로필 이미지 업로드 + 즉시 반영 |
| `DELETE /api/v1/members/me/profile-image` | 필수 | 프로필 이미지 제거 |

허용 형식은 `jpg / png / gif / webp`, 기본 상한은 파일당 5MB(`MINIO_MAX_FILE_BYTES`)다.

### 프로필 이미지

업로드하면 즉시 회원 정보에 반영된다(임시 저장 단계 없음). 기존 이미지가 있으면 교체 후 이전 파일은 삭제된다.

```http
POST /api/v1/members/me/profile-image
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

imageFile: (binary)
```

```json
{
  "dataHeader": { "resultCode": "SUCCESS" },
  "dataBody": {
    "profileImageKey": "members/profiles/202507110001/2026/08/3f2a9c11-....png",
    "profileImageUrl": "https://minio.8llow8llowme.com/bosspickseoul/members/profiles/..."
  }
}
```

- `GET /api/v1/members/me` 의 `profileImageUrl` 은 **직접 업로드본이 있으면 그 URL**, 없으면 소셜 제공자 URL 이다.
  프론트는 이 필드 하나만 쓰면 되고 출처를 구분할 필요가 없다.
- **`PATCH /api/v1/members/me` 는 더 이상 `profileImageUrl` 을 받지 않는다.** 임의 URL 을 회원 정보에
  넣을 수 있으면 외부 이미지를 우리 서비스인 것처럼 노출시킬 수 있어 전용 API 로 분리했다.
  이 PATCH 는 이제 닉네임만 수정하며, 이미지 제거는 `DELETE` 를 쓴다.

## 에러 코드

| 상황 | HTTP | resultCode |
| --- | --- | --- |
| 파일 없음/빈 파일 | 400 | `STORAGE_001` |
| 크기 초과 (자체 검증 및 multipart 상한) | 400 | `STORAGE_002` |
| 이미지가 아닌 파일 (매직 바이트 불일치) | 400 | `STORAGE_003` |
| 업로드 실패 (MinIO 장애 등) | 500 | `STORAGE_004` |
| 키 형식 오류 | 400 | `STORAGE_005` |
| 남이 올린 키를 연결하려는 시도 | 403 | `STORAGE_006` |
| 장수 초과 | 400 | `STORAGE_007` |

## 인프라 계약

- 버킷과 **anonymous read 정책은 애플리케이션 기동 시 `StorageBucketInitializer` 가 보장**한다.
  콘솔 수동 설정에 의존하지 않으므로 서버를 재구축해도 누락되지 않는다.
- 백엔드는 MinIO 와 다른 호스트이므로 `MINIO_ENDPOINT` 에 컨테이너명이 아니라 사설 IP 를 넣는다
  (`http://192.168.0.12:9000`). 공개 조회는 `MINIO_PUBLIC_URL`(`https://minio.8llow8llowme.com`)을 쓴다.
- auth-service 는 nginx 직결이라 게이트웨이 관련 조치가 필요 없고, nginx `client_max_body_size 150M`
  안이라 추가 설정도 없다.

## 알려진 한계 (후속 과제)

- **고아 파일 회수 배치가 없다.** 업로드 직후 DB 반영에 실패하면 즉시 회수하지만, 그 외 경로로 남는
  미참조 객체는 정리되지 않는다. MinIO lifecycle rule 또는 batch-service 정리 잡이 필요하다.
- **업로드 rate limit 이 없다.** 인증만 되면 5MB 요청을 반복할 수 있다.
- **이미지 리사이즈/썸네일 생성을 하지 않는다.** 원본을 그대로 서빙한다.
