-- 정책 추천 시드 데이터 (서울시 소상공인 지원 정책)
-- 실행: commercial-service DB에 수동 또는 flyway/liquibase로 적재
-- 업데이트 기준: 2024년 기준 서울시·중앙정부·유관기관 공개 정책

INSERT INTO policy (policy_id, policy_name, provider, target_age_group, target_startup_stage, target_district_code, support_summary, application_period, reference_url, is_active)
VALUES
-- ① 서울시 전체 · 연령 무관 · 단계 무관
('SBDC-2024-001', '서울특별시 소상공인 경영개선 지원사업', '서울특별시 소상공인지원센터',
 'ALL', 'ALL', NULL,
 '경영 진단, 컨설팅, 마케팅 교육 등 종합 경영 지원',
 '연중 상시 (분기별 선발)', 'https://www.seoulsbdc.or.kr', true),

('SBDC-2024-002', '소상공인 스마트상점 기술보급사업', '중소벤처기업부',
 'ALL', 'ALL', NULL,
 'POS·키오스크·배달시스템 등 스마트 기기 도입 비용 지원 (최대 150만 원)',
 '연 2회 공고 (상·하반기)', 'https://www.sbiz.or.kr', true),

('SBDC-2024-003', '서울 전통시장 및 상점가 활성화 지원', '서울특별시',
 'ALL', 'ALL', NULL,
 '시설 개선, 공동 마케팅, 온라인 진출 컨설팅 지원',
 '연간 공고 확인 (서울시 공고 기준)', 'https://www.seoul.go.kr', true),

-- ② 청년 창업 특화
('SBDC-2024-011', '청년 창업 도전 프로젝트', '서울신용보증재단',
 'YOUTH', 'PRE', NULL,
 '사업계획서 멘토링, 초기 보증 연계, 네트워킹 지원',
 '연 2회 선발 (상반기 3월, 하반기 9월)', 'https://www.seoulshinbo.co.kr', true),

('SBDC-2024-012', '청년창업사관학교 (OASIS)', '중소벤처기업진흥공단',
 'YOUTH', 'PRE', NULL,
 '창업 교육, 멘토링, 사무공간, 사업화 자금(최대 1억 원) 지원',
 '연 1회 선발 (매년 2월~3월 공고)', 'https://oasis.kosmes.or.kr', true),

('SBDC-2024-013', '청년몰 입점 지원사업', '서울특별시',
 'YOUTH', 'EARLY', NULL,
 '서울시 청년몰 임대료 지원 및 판로 연계',
 '공모 기간 내 신청 (시 공고 기준)', 'https://www.seoul.go.kr', true),

-- ③ 중장년 창업 특화
('SBDC-2024-021', '장년 창업지원 프로그램 (포스트 50)', '서울특별시 50+재단',
 'MIDDLE', 'PRE', NULL,
 '인생 2막 창업 교육, 사업화 컨설팅, 법인 설립 지원',
 '상시 접수 (50+캠퍼스 방문 또는 온라인)', 'https://www.50plus.or.kr', true),

('SBDC-2024-022', '중장년 기술창업 지원사업', '중소벤처기업부',
 'MIDDLE', 'PRE', NULL,
 '기술 기반 창업 교육, 사업화 자금(최대 5,000만 원) 지원',
 '연 1회 공고 (중기부 공고 기준)', 'https://www.bizinfo.go.kr', true),

-- ④ 예비창업자 특화
('SBDC-2024-031', '예비창업패키지', '중소벤처기업부',
 'ALL', 'PRE', NULL,
 '창업 교육, 멘토링, 사업화 자금(최대 1억 원) 지원',
 '연 1회 공고 (매년 1월~2월)', 'https://www.k-startup.go.kr', true),

('SBDC-2024-032', '소상공인 창업학교', '소상공인시장진흥공단',
 'ALL', 'PRE', NULL,
 '업종별 실전 창업 교육 (외식, 서비스, 도소매 등)',
 '연중 상시 (기수별 모집)', 'https://edu.sbiz.or.kr', true),

-- ⑤ 초기창업자 특화
('SBDC-2024-041', '초기창업패키지', '중소벤처기업부',
 'ALL', 'EARLY', NULL,
 '사업화 자금(최대 1억 원), 멘토링, 전담 BI 공간 지원',
 '연 1회 공고 (창업 3년 미만)', 'https://www.k-startup.go.kr', true),

('SBDC-2024-042', '소상공인 정책자금 (창업초기자금)', '소상공인시장진흥공단',
 'ALL', 'EARLY', NULL,
 '창업 초기 운전 자금 및 시설 자금 저금리 대출 (연 2.0%~)',
 '연중 상시 (예산 소진 시 마감)', 'https://ols.sbiz.or.kr', true),

-- ⑥ 금융 지원
('SBDC-2024-051', '서울시 소상공인 이자 지원사업', '서울특별시',
 'ALL', 'ALL', NULL,
 '소상공인 사업자 대출 이자 일부 지원 (연 최대 3% 포인트)',
 '연간 공고 확인 (서울시 공고 기준)', 'https://www.seoul.go.kr', true),

('SBDC-2024-052', '소상공인 신용보증 특례', '서울신용보증재단',
 'ALL', 'ALL', NULL,
 '담보 없이 최대 5,000만 원 보증 지원 (신규 창업자 우대)',
 '연중 상시 (재단 지점 방문 또는 온라인)', 'https://www.seoulshinbo.co.kr', true),

-- ⑦ 디지털·온라인 전환
('SBDC-2024-061', '소상공인 온라인 진출 지원 (온라인 판로 개척)', '소상공인시장진흥공단',
 'ALL', 'ALL', NULL,
 '스마트스토어·쿠팡·배달앱 입점 교육 및 컨설팅 비용 지원',
 '연중 상시 (분기별 선발)', 'https://www.sbiz.or.kr', true),

('SBDC-2024-062', '서울 소상공인 SNS 마케팅 지원', '서울특별시 소상공인지원센터',
 'ALL', 'ALL', NULL,
 'SNS 계정 개설, 콘텐츠 제작 교육, 광고 비용 일부 지원',
 '연 2회 공고', 'https://www.seoulsbdc.or.kr', true);
