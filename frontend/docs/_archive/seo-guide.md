# Frontend SEO Guide

## 1. 목적

- 이 문서는 `NowDoBoss-V2/frontend`의 SEO 기준 문서다.
- 목표는 공개 가능한 페이지가 Next.js 마이그레이션 과정에서 SEO 골격을 잃지 않도록 하는 것이다.
- SEO는 전 기능 이관 후 일괄 처리하지 않는다. 공개 페이지는 이관 시점에 기본 metadata를 함께 넣는다.

## 2. 기본 원칙

- 공개 페이지와 비공개 페이지를 반드시 구분한다.
- 공개 페이지는 `title`, `description`, `canonical`, `Open Graph`를 기본으로 가진다.
- 비공개 페이지는 색인 대상이 아니므로 `noindex` 정책을 명시한다.
- 검색 유입보다 사용성 우선인 화면이라도, 공개 경로라면 최소 metadata는 누락하지 않는다.
- 키워드 남발보다 페이지 목적이 명확한 제목과 설명을 우선한다.

## 3. 라우트 분류 정책

### 3.1 색인 대상 후보

다음 페이지는 기본적으로 색인 대상 후보로 본다.

- 메인 페이지
- 서비스 소개 성격의 공개 페이지
- 공개 커뮤니티 목록/상세 페이지
- 외부 공유용 리포트 페이지

### 3.2 비색인 대상

다음 페이지는 기본적으로 `noindex` 대상이다.

- 로그인
- 회원가입
- 소셜 로그인 콜백
- 프로필
- 설정
- 북마크
- 채팅
- 개인 맞춤 분석 입력/결과 화면
- 권한이 필요한 내부 기능 화면

## 4. Next.js 구현 기준

- 공통 SEO는 `app/layout.tsx`의 `metadata` 기본값에 둔다.
- 페이지별 SEO는 각 `page.tsx` 또는 segment layout에서 override 한다.
- 동적 공개 페이지는 slug/params 기반으로 metadata를 생성한다.
- canonical은 실제 운영 도메인 기준 절대 URL을 사용한다.
- 환경별 도메인 차이는 환경변수 또는 사이트 설정 상수로 통일 관리한다.

## 5. 필수 metadata 규칙

공개 페이지는 최소 아래 항목을 가진다.

- `title`
- `description`
- `alternates.canonical`
- `openGraph.title`
- `openGraph.description`
- `openGraph.url`
- `openGraph.type`

권장 추가 항목:

- `openGraph.images`
- `twitter.card`
- `twitter.title`
- `twitter.description`

## 6. 제목 규칙

- 제목은 페이지 목적이 즉시 드러나야 한다.
- 길이는 보통 `55~65`자 이내를 권장한다.
- 브랜드명은 뒤쪽에 붙이는 방식을 우선한다.

권장 형식:

- `{핵심 주제} | NowDoBoss`
- `{지역/게시글 제목} | 커뮤니티 | NowDoBoss`
- `{리포트 제목} | 상권 리포트 | NowDoBoss`

나쁜 예:

- `NowDoBoss`
- `홈`
- `추천`
- 키워드만 나열한 제목

## 7. 설명 규칙

- description은 페이지 내용을 한두 문장으로 요약한다.
- 길이는 대체로 `110~160`자 이내를 권장한다.
- 기능명만 반복하지 말고 사용자가 얻는 정보를 포함한다.
- 중복 description을 여러 페이지에 복사하지 않는다.

## 8. canonical 규칙

- canonical은 색인 대상 공개 페이지에 넣는다.
- query parameter 추적값은 canonical에 포함하지 않는다.
- 필터 조합 페이지가 여러 URL을 만들더라도 대표 URL이 있다면 canonical을 고정한다.

예시:

- 커뮤니티 상세: `/community/[communityId]`
- 공유 리포트: `/share/[token]`

## 9. Open Graph 규칙

- 모든 공개 페이지는 Open Graph를 가진다.
- OG 제목과 설명은 기본 metadata와 의미가 크게 어긋나지 않게 유지한다.
- 대표 이미지는 가급적 `1200x630` 비율을 우선한다.
- 공유 페이지는 가능한 경우 동적 OG 이미지 전략을 검토한다.

## 10. robots 정책

- 사이트 전역 `robots.txt`를 둔다.
- 비공개 경로는 페이지 metadata 수준에서 `noindex`를 적용한다.
- staging, preview 환경은 기본적으로 검색엔진 색인을 막는다.

## 11. sitemap 정책

- 공개 페이지 중심으로 sitemap을 구성한다.
- 로그인 후 전용 페이지, 개인화 페이지, 임시 테스트 페이지는 포함하지 않는다.
- 동적 공개 페이지가 있다면 생성 기준과 제외 기준을 명확히 둔다.

## 12. 구조화 데이터

구조화 데이터는 2차 단계에서 확장하되, 아래 후보를 우선 검토한다.

- `WebSite`
- `Organization`
- `BreadcrumbList`
- `Article` 또는 `DiscussionForumPosting`
- `Report` 성격 페이지에 맞는 일반 구조

처음부터 무리하게 많이 넣지 않는다. 실제 페이지 의미와 맞는 타입만 사용한다.

## 13. 시맨틱 마크업

- 페이지마다 가능한 한 `main`을 하나 둔다.
- 제목 구조는 `h1 -> h2 -> h3` 순서를 크게 벗어나지 않는다.
- 버튼으로 이동하는 요소와 링크 요소를 혼용하지 않는다.
- 본문성 콘텐츠는 div만으로 쌓지 말고 section/article/nav를 검토한다.

## 14. 성능과 SEO

- SEO는 metadata만으로 끝나지 않는다. 공개 페이지는 렌더링 성능도 같이 본다.
- 큰 이미지에는 `next/image` 사용을 우선 검토한다.
- 폰트와 주요 hero 이미지는 과하게 무겁지 않게 유지한다.
- 첫 화면에서 꼭 필요 없는 대형 클라이언트 번들은 지연 로딩을 검토한다.

## 15. 페이지 유형별 기준

### 메인 페이지

- 색인 대상
- 서비스 가치와 핵심 키워드가 드러나는 title/description
- 기본 OG 이미지 사용 가능

### 로그인/회원가입

- 비색인
- `noindex`

### 프로필/설정/북마크

- 비색인
- `noindex`

### 커뮤니티 목록/상세

- 공개 정책이 유지된다면 색인 대상
- 상세는 글 제목 기반 metadata 사용
- 저품질/삭제/비공개 게시글은 색인 제외 검토

### 분석/시뮬레이션

- 기본적으로 비색인
- 권한 또는 개인 세션 의존성이 크므로 `noindex`

### 공유 리포트

- 외부 공유 목적이라면 색인 여부를 별도 판단
- 최소한 OG는 반드시 설정
- 토큰형 URL은 색인 허용 여부를 제품 정책에 따라 결정

## 16. 구현 체크리스트

- 공개 페이지에 `metadata`가 있는가
- 비공개 페이지에 `noindex`가 있는가
- canonical이 절대 URL인가
- title과 description이 중복되지 않는가
- OG 정보가 누락되지 않았는가
- 시맨틱 제목 구조가 무너지지 않았는가

## 17. 피해야 할 것

- 모든 페이지에 같은 title/description 재사용
- 로그인/개인화 페이지 색인 허용
- 쿼리 파라미터가 붙은 URL을 canonical로 그대로 노출
- 본문과 무관한 키워드 나열
- 공개 페이지 metadata를 나중으로 계속 미루는 것
