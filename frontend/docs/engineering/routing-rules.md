# Routing Rules

## 기본 원칙

- 새로 이관한 route에서는 `react-router-dom`을 사용하지 않는다.
- Next.js App Router 파일 구조를 기준으로 route를 만든다.
- 레거시 URL과 Next URL은 가능한 1:1로 대응시킨다.
- route 변경은 동작 동일성 확인 후에만 확장한다.

## App Router 기준

- 페이지 진입점은 `app/**/page.tsx`다.
- 공통 UI는 필요한 경우 `layout.tsx`로 올린다.
- header/footer 노출 예외는 route group으로 분리한다.
- 동적 route는 `[param]` 세그먼트를 사용한다.
- query string은 `useSearchParams`로 읽는다.

## Hook 대체 규칙

- `useNavigate` -> `useRouter`
- `useLocation` -> `usePathname` 또는 `useSearchParams`
- `useParams` -> Next params hook 또는 page params
- route guard는 client boundary와 auth/session 흐름을 고려해 구현한다.

## 완료 확인

- 대상 URL이 404 없이 열린다.
- 레거시 route의 주요 navigation 흐름이 보존된다.
- header/footer/layout 노출 규칙이 기존과 어긋나지 않는다.
- 공개/비공개 route의 SEO 정책이 `docs/seo-guide.md`와 맞는다.
