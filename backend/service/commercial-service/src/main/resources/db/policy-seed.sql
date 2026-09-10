-- 소상공인 지원 정책 시드 데이터
--
-- 2026-09-09 공고·보도자료를 수동 대조한 **스냅샷**이다.
-- 실시간 수집 job 은 아직 없고(feature-status.md "정책 추천 실 데이터 연동"),
-- 마감되면 추천 조회에서 빠지므로 공고가 바뀌면 이 파일을 다시 맞춰야 한다.
--
-- 실행: commercial-service DB 에 수동 적재
--   mysql -u <user> -p <schema> < policy-seed.sql
-- 같은 id 대역을 다시 넣으면 아래 DELETE 가 기존 시드를 교체한다.
--
-- 규칙
--   district_code           NULL = 서울 전역/전국, 값 있으면 해당 자치구 전용
--   service_category_code   NULL = 전업종, 값 있으면 해당 업종 대분류(CS1 음식 / CS2 서비스 / CS3 소매)
--   apply_end_at            NULL = 상시 모집 또는 자금 소진 시까지
--   id                      Snowflake 대신 시드용 고정값(9000000000000000001~). 실데이터와 충돌하지 않는 대역이다.
--   detail_url              기관 메인이 아니라 공고·신청 안내 상세

DELETE FROM policy
WHERE id BETWEEN 9000000000000000001 AND 9000000000000000025;

INSERT INTO policy
(id, title, organization, support_type, target_summary, support_content,
 district_code, service_category_code, apply_start_at, apply_end_at, detail_url)
VALUES
-- 전 지역·전업종
(9000000000000000001, '소상공인 정책자금 (일반경영안정자금)', '소상공인시장진흥공단', 'FUNDING',
 '업력 무관 소상공인', '업체당 최대 7천만원, 대출기간 5년(거치 2년)',
 NULL, NULL, '2026-01-05', NULL, 'https://ols.sbiz.or.kr'),
(9000000000000000002, '서울시 긴급자영업자금', '서울신용보증재단', 'FUNDING',
 '서울시 소재 중소기업 및 소상공인', '업체당 최대 5천만원 (서울시 직접융자)',
 NULL, NULL, '2026-01-02', NULL, 'https://news.seoul.go.kr/economy/rearing-funds'),
(9000000000000000003, '2026년 스마트상점 기술보급사업 (2차)', '소상공인시장진흥공단', 'FACILITY',
 '신청일 현재 영업 중인 소상공인 점포', '구입형 일반기술 최대 500만원(도입비 70%), 배리어프리 키오스크 최대 700만원',
 NULL, NULL, '2026-08-26', '2026-09-30', 'https://www.sbiz.or.kr/smst/notice/view.do?key=2111306004395&notcSn=67'),
(9000000000000000004, '서울시 소상공인 아카데미', '서울특별시 자영업지원센터', 'EDUCATION',
 '서울시 소상공인 및 예비창업자', '경영개선·재도전 온라인 교육 무료 수강',
 NULL, NULL, NULL, NULL, 'https://edu.seoulsbdc.or.kr'),
(9000000000000000005, '자영업자 안심통장 4호', '서울신용보증재단', 'FUNDING',
 '서울시 소재 업력 1년 이상 개인사업자 (NICE 600점 이상)', '마이너스통장 최대 2천만원, 보증료 연 1.0%',
 NULL, NULL, '2026-09-03', NULL, 'https://mediahub.seoul.go.kr/archives/2019261'),

-- 업종 대분류 한정 (음식 CS1). 검증된 CS2·CS3 전용 공고가 없어 허구 직무교육·무인결제는 넣지 않는다.
-- 서비스·소매 상권은 전 지역 정책(카테고리 NULL)으로 매칭된다.
(9000000000000000011, '2026년 식품안심업소 기술지원', '한국식품안전관리인증원', 'SUBSIDY',
 '식품안심업소(음식점 위생등급제) 지정 희망 음식점', '현장 맞춤형 기술지원 무상, 2,000개소',
 NULL, 'CS1', '2026-03-18', '2026-09-30', 'https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_000000000120010'),
(9000000000000000012, '서울배달상생자금', '서울신용보증재단', 'FUNDING',
 '서울배달 상생 인증 음식점 (땡겨요 월 3건 이상)', '특별보증 최대 1억원, 이차보전 연 2.0%p',
 NULL, 'CS1', '2026-07-18', NULL, 'https://news.seoul.go.kr/economy/rearing-funds'),
(9000000000000000013, '서울형 다시서기 프로젝트', '서울시', 'SUBSIDY',
 '재창업·성실실패·성실상환 서울시 소상공인', '교육·컨설팅, 재도전 초기자금 최대 200만원',
 NULL, NULL, '2026-07-08', '2026-10-30', 'https://news.seoul.go.kr/economy/archives/573571'),
(9000000000000000014, '서울시 식품진흥기금 시설개선 융자', '서울시', 'FACILITY',
 '서울 소재 일반·휴게음식점 및 제과점', '접객업소 시설개선 최대 1억원, 연 2%',
 NULL, 'CS1', NULL, NULL, 'https://mediahub.seoul.go.kr/archives/2017220'),

-- 전 지역 판로 (허구 SBA 라이브커머스 카드 대체). 공고상 모집완료 시 조기마감.
(9000000000000000022, '2026년 라이브커머스 제작·운영 지원사업', '한국중소벤처기업유통원', 'MARKETING',
 '소상공인', '라이브커머스 기획·제작·송출·판매 전 과정 지원. 신청은 판판대로',
 NULL, NULL, '2026-07-20', NULL, 'https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_000000000124551'),

-- 자치구 한정
(9000000000000000021, '강남구 중소기업·소상공인 대출이자 지원', '강남구청', 'SUBSIDY',
 '강남구 소재 사업자등록 1년 이상 중소기업·소상공인', '신용보증서 담보 시 연 2.5% 이자 지원, 자금 소진 시까지',
 '11680', NULL, '2026-02-27', NULL, 'https://www.gangnam.go.kr/board/B_000001/1076295/view.do?mid=ID05_040101'),
(9000000000000000023, '송파구 특별신용보증', '송파구청', 'FUNDING',
 '송파구 소재 소기업·소상공인', '업체당 보증 최대 5천만원, 보증료 신규 연 0.8%',
 '11710', NULL, '2026-08-03', NULL, 'https://www.songpa.go.kr/job/contents.do?key=3433'),
(9000000000000000024, '종로구 소상공인 라이브커머스 지원사업', '종로구청', 'MARKETING',
 '종로구 소재 소상공인', '라이브커머스 제작·송출 지원, 예산 소진 시까지',
 '11110', NULL, '2026-08-13', NULL, 'https://market.jongno.go.kr/support/support_jongno'),
(9000000000000000025, '영등포구 소기업·소상공인 특별신용보증', '영등포구청', 'FUNDING',
 '영등포구 소재 소기업·소상공인', '서울신용보증재단 영등포지점 추천, 연중 접수',
 '11560', NULL, NULL, NULL, 'https://www.ydp.go.kr/www/contents.do?key=3336');
