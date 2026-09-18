-- income_administration 에 소비 세부 10항목을 추가한다. Workbench 에서 bosspickseoul_commercial_dev 를 선택한 뒤 실행한다.
-- 이슈 #415 1단계. 상권 소비(income_commercial)가 20241 분기부터 전 행 0 이라(#413) 행정동 소비를 대체 원천으로 쓴다.
--
-- 원천은 서울 열린데이터광장 「상권분석서비스(소득소비-행정동)」 VwsmAdstrdNcmCnsmpW 다.
-- 2026-09-17 Open API 전수 호출에서 425개 행정동 × 22분기(20211~20262) 모두 아래 11개 금액 필드가 존재했고,
-- EXPNDTR_TOTAMT 는 세부 항목합과 차이가 0 이었다.
--
-- 항목 구성이 income_commercial 과 다르다. 억지로 맞추지 않는다.
-- - 상권은 LSR(여가)/CLTUR(문화)가 나뉘지만 행정동은 LSR_CLTUR 합산본만 준다.
--   그래서 leisure_expense_amount / culture_expense_amount 가 아니라 leisure_culture_expense_amount 다.
--   같은 이름을 쓰면 정의가 다른 값이 같은 이름으로 공존한다(#413 의 totalExpenseAmount 와 같은 실수).
-- - 상권에 없는 ETC(기타)·FD(음식)가 더 있다. 음식은 식료품(grocery)과 다른 항목이라 dining 으로 둔다.
--
-- 기존 행은 총액만 적재돼 있으므로 새 컬럼은 NULL 로 둔다. 재이관(--job=project) 전까지 NULL 이 정상이다.
-- 컬럼 DDL 만으로는 값이 채워지지 않는다. 게시된 분기마다 --job=project 가 필요하다.
--   절차: backend/docs/services/batch-quarterly-import.md 「9. 행정동 소비 세부 항목 재이관」
--
-- Hibernate 기본 전략은 snake_case 다. 이 테이블 컬럼이 camelCase(periodCode) 로 만들어져 있으면
-- 아래 이름도 camelCase 로 바꿔 실행한다.

ALTER TABLE income_administration
    ADD COLUMN grocery_expense_amount BIGINT NULL
        COMMENT '식료품 지출 금액 (FDSTFFS_EXPNDTR_TOTAMT)',
    ADD COLUMN clothing_expense_amount BIGINT NULL
        COMMENT '의류/신발 지출 금액 (CLTHS_FTWR_EXPNDTR_TOTAMT)',
    ADD COLUMN household_expense_amount BIGINT NULL
        COMMENT '생활용품 지출 금액 (LVSPL_EXPNDTR_TOTAMT)',
    ADD COLUMN medical_expense_amount BIGINT NULL
        COMMENT '의료비 지출 금액 (MCP_EXPNDTR_TOTAMT)',
    ADD COLUMN transportation_expense_amount BIGINT NULL
        COMMENT '교통 지출 금액 (TRNSPORT_EXPNDTR_TOTAMT)',
    ADD COLUMN education_expense_amount BIGINT NULL
        COMMENT '교육 지출 금액 (EDC_EXPNDTR_TOTAMT)',
    ADD COLUMN entertainment_expense_amount BIGINT NULL
        COMMENT '유흥 지출 금액 (PLESR_EXPNDTR_TOTAMT)',
    ADD COLUMN leisure_culture_expense_amount BIGINT NULL
        COMMENT '여가/문화 합산 지출 금액 (LSR_CLTUR_EXPNDTR_TOTAMT). 상권의 여가·문화 분리 컬럼과 정의가 다르다',
    ADD COLUMN other_expense_amount BIGINT NULL
        COMMENT '기타 지출 금액 (ETC_EXPNDTR_TOTAMT). 상권 소비에는 없는 항목',
    ADD COLUMN dining_expense_amount BIGINT NULL
        COMMENT '음식(외식) 지출 금액 (FD_EXPNDTR_TOTAMT). 식료품과 다른 항목이며 상권 소비에는 없다';

-- 적용 확인: 컬럼 15개(id 포함)와 아직 NULL 인 세부 항목 건수를 본다.
SELECT COUNT(*)                                   AS rows_total,
       COUNT(total_expense_amount)                AS total_filled,
       COUNT(grocery_expense_amount)              AS grocery_filled,
       COUNT(leisure_culture_expense_amount)      AS leisure_culture_filled,
       COUNT(dining_expense_amount)               AS dining_filled
  FROM income_administration;

-- 재이관 후 확인: 세부 10항목 합과 total_expense_amount 의 차이가 0 이어야 한다.
-- 원천에서 EXPNDTR_TOTAMT = 세부 항목합이고 차이가 0 인 것을 2026-09-17 전수 호출로 확인했다.
SELECT period_code,
       spatial_version,
       COUNT(*) AS rows_total,
       SUM(CASE WHEN total_expense_amount <> (
             grocery_expense_amount + clothing_expense_amount + household_expense_amount + medical_expense_amount
             + transportation_expense_amount + education_expense_amount + entertainment_expense_amount
             + leisure_culture_expense_amount + other_expense_amount + dining_expense_amount)
           THEN 1 ELSE 0 END) AS total_mismatch_rows
  FROM income_administration
 WHERE grocery_expense_amount IS NOT NULL
 GROUP BY period_code, spatial_version
 ORDER BY period_code;
