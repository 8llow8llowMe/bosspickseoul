package com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * One Seoul commercial-analysis dataset. Each constant maps to exactly one legacy fact table
 * so a quarter can be backfilled for every table the services already read.
 *
 * <p>Every service name was confirmed by a live call on 2026-09-08 (sample key). Two facts about the
 * live API shape the pipeline: only some services honour the quarter path argument (the rest return the
 * full 2021+ timeline and are filtered while streaming), and numeric fields arrive as JSON numbers.
 * The consumption dataset for commercial areas was re-published as "소비-상권배후지"
 * ({@code VwsmTrdhlNcmCnsmpQq}); it no longer carries the income columns the legacy table has.
 *
 * <p>A blank service would mean no Open API contract is registered, so the dataset is CSV/ZIP only;
 * {@code ImportRequest} rejects an API run for it instead of guessing an endpoint.
 *
 * <p>One dataset is discontinued rather than merely reshaped: see {@link #LAST_PUBLISHABLE_QUARTER}.
 */
public enum Dataset {
    SALES_COMMERCIAL("VwsmTrdarSelngQq", AreaScope.COMMERCIAL, true, List.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "THSMON_SELNG_AMT",
        "MON_SELNG_AMT", "TUES_SELNG_AMT", "WED_SELNG_AMT", "THUR_SELNG_AMT", "FRI_SELNG_AMT", "SAT_SELNG_AMT", "SUN_SELNG_AMT",
        "TMZON_00_06_SELNG_AMT", "TMZON_06_11_SELNG_AMT", "TMZON_11_14_SELNG_AMT", "TMZON_14_17_SELNG_AMT",
        "TMZON_17_21_SELNG_AMT", "TMZON_21_24_SELNG_AMT",
        "ML_SELNG_AMT", "FML_SELNG_AMT",
        "AGRDE_10_SELNG_AMT", "AGRDE_20_SELNG_AMT", "AGRDE_30_SELNG_AMT", "AGRDE_40_SELNG_AMT",
        "AGRDE_50_SELNG_AMT", "AGRDE_60_ABOVE_SELNG_AMT",
        "MON_SELNG_CO", "TUES_SELNG_CO", "WED_SELNG_CO", "THUR_SELNG_CO", "FRI_SELNG_CO", "SAT_SELNG_CO", "SUN_SELNG_CO",
        "TMZON_00_06_SELNG_CO", "TMZON_06_11_SELNG_CO", "TMZON_11_14_SELNG_CO", "TMZON_14_17_SELNG_CO",
        "TMZON_17_21_SELNG_CO", "TMZON_21_24_SELNG_CO",
        "ML_SELNG_CO", "FML_SELNG_CO")),
    STORE_COMMERCIAL("VwsmTrdarStorQq", AreaScope.COMMERCIAL, true, List.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "STOR_CO", "SIMILR_INDUTY_STOR_CO", "OPBIZ_RT", "OPBIZ_STOR_CO", "CLSBIZ_RT", "CLSBIZ_STOR_CO", "FRC_STOR_CO")),
    // 이관 대상 팩트 테이블이 NOT NULL 로 요구할 컬럼(shared DatasetKey.readerRequiredFields)을 게시 단계에서 전부 요구한다.
    // 여기서 걸러야 결손 행이 게시돼 이관 때 그대로 넘어오는 일이 없다. 조회 측 매퍼는 2026-09-10 제거됐고,
    // DatasetTest 가 DatasetKey 와의 포함 관계를 계속 고정한다.
    FOOT_TRAFFIC_COMMERCIAL("VwsmTrdarFlpopQq", AreaScope.COMMERCIAL, false, List.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM",
        "TOT_FLPOP_CO", "ML_FLPOP_CO", "FML_FLPOP_CO",
        "AGRDE_10_FLPOP_CO", "AGRDE_20_FLPOP_CO", "AGRDE_30_FLPOP_CO", "AGRDE_40_FLPOP_CO", "AGRDE_50_FLPOP_CO", "AGRDE_60_ABOVE_FLPOP_CO",
        "TMZON_00_06_FLPOP_CO", "TMZON_06_11_FLPOP_CO", "TMZON_11_14_FLPOP_CO", "TMZON_14_17_FLPOP_CO", "TMZON_17_21_FLPOP_CO",
        "TMZON_21_24_FLPOP_CO",
        "MON_FLPOP_CO", "TUES_FLPOP_CO", "WED_FLPOP_CO", "THUR_FLPOP_CO", "FRI_FLPOP_CO", "SAT_FLPOP_CO", "SUN_FLPOP_CO")),
    CHANGE_COMMERCIAL("VwsmTrdarIxQq", AreaScope.COMMERCIAL, false, List.of(
        "TRDAR_CHNGE_IX", "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM")),
    POPULATION_COMMERCIAL("VwsmTrdarRepopQq", AreaScope.COMMERCIAL, false, List.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM",
        "TOT_REPOP_CO", "ML_REPOP_CO", "FML_REPOP_CO",
        "AGRDE_10_REPOP_CO", "AGRDE_20_REPOP_CO", "AGRDE_30_REPOP_CO", "AGRDE_40_REPOP_CO",
        "AGRDE_50_REPOP_CO", "AGRDE_60_ABOVE_REPOP_CO")),
    FACILITY_COMMERCIAL("VwsmTrdarFcltyQq", AreaScope.COMMERCIAL, false, List.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM",
        "VIATR_FCLTY_CO", "ELESCH_CO", "MSKUL_CO", "HGSCHL_CO", "UNIV_CO", "SUBWAY_STATN_CO", "BUS_STTN_CO")),
    CONSUMPTION_COMMERCIAL("VwsmTrdhlNcmCnsmpQq", AreaScope.COMMERCIAL, false, List.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM", "EXPNDTR_TOTAMT",
        "FDSTFFS_EXPNDTR_TOTAMT", "CLTHS_FTWR_EXPNDTR_TOTAMT", "MCP_EXPNDTR_TOTAMT", "LVSPL_EXPNDTR_TOTAMT",
        "TRNSPORT_EXPNDTR_TOTAMT", "LSR_EXPNDTR_TOTAMT", "CLTUR_EXPNDTR_TOTAMT", "EDC_EXPNDTR_TOTAMT",
        "PLESR_EXPNDTR_TOTAMT")),
    SALES_ADMINISTRATION("VwsmAdstrdSelngW", AreaScope.ADMINISTRATION, true, List.of(
        "ADSTRD_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "THSMON_SELNG_AMT", "MDWK_SELNG_AMT", "WKEND_SELNG_AMT")),
    STORE_ADMINISTRATION("VwsmAdstrdStorW", AreaScope.ADMINISTRATION, true, List.of(
        "ADSTRD_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "STOR_CO", "SIMILR_INDUTY_STOR_CO", "OPBIZ_RT", "OPBIZ_STOR_CO", "CLSBIZ_RT", "CLSBIZ_STOR_CO", "FRC_STOR_CO")),
    CONSUMPTION_ADMINISTRATION("VwsmAdstrdNcmCnsmpW", AreaScope.ADMINISTRATION, false, List.of(
        "ADSTRD_CD_NM", "EXPNDTR_TOTAMT")),
    SALES_DISTRICT("VwsmSignguSelngW", AreaScope.DISTRICT, true, List.of(
        "SIGNGU_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "THSMON_SELNG_AMT",
        "MON_SELNG_AMT", "TUES_SELNG_AMT", "WED_SELNG_AMT", "THUR_SELNG_AMT", "FRI_SELNG_AMT", "SAT_SELNG_AMT", "SUN_SELNG_AMT",
        "TMZON_00_06_SELNG_AMT", "TMZON_06_11_SELNG_AMT", "TMZON_11_14_SELNG_AMT", "TMZON_14_17_SELNG_AMT",
        "TMZON_17_21_SELNG_AMT", "TMZON_21_24_SELNG_AMT",
        "ML_SELNG_AMT", "FML_SELNG_AMT",
        "AGRDE_10_SELNG_AMT", "AGRDE_20_SELNG_AMT", "AGRDE_30_SELNG_AMT", "AGRDE_40_SELNG_AMT",
        "AGRDE_50_SELNG_AMT", "AGRDE_60_ABOVE_SELNG_AMT")),
    STORE_DISTRICT("VwsmSignguStorW", AreaScope.DISTRICT, true, List.of(
        "SIGNGU_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "STOR_CO", "SIMILR_INDUTY_STOR_CO", "OPBIZ_RT", "OPBIZ_STOR_CO", "CLSBIZ_RT", "CLSBIZ_STOR_CO", "FRC_STOR_CO")),
    FOOT_TRAFFIC_DISTRICT("VwsmSignguFlpopW", AreaScope.DISTRICT, false, List.of(
        "SIGNGU_CD_NM",
        "TOT_FLPOP_CO", "ML_FLPOP_CO", "FML_FLPOP_CO",
        "AGRDE_10_FLPOP_CO", "AGRDE_20_FLPOP_CO", "AGRDE_30_FLPOP_CO", "AGRDE_40_FLPOP_CO", "AGRDE_50_FLPOP_CO",
        "AGRDE_60_ABOVE_FLPOP_CO",
        "TMZON_00_06_FLPOP_CO", "TMZON_06_11_FLPOP_CO", "TMZON_11_14_FLPOP_CO", "TMZON_14_17_FLPOP_CO",
        "TMZON_17_21_FLPOP_CO", "TMZON_21_24_FLPOP_CO",
        "MON_FLPOP_CO", "TUES_FLPOP_CO", "WED_FLPOP_CO", "THUR_FLPOP_CO", "FRI_FLPOP_CO", "SAT_FLPOP_CO", "SUN_FLPOP_CO")),
    CONSUMPTION_DISTRICT("VwsmSignguNcmCnsmpW", AreaScope.DISTRICT, false, List.of(
        "SIGNGU_CD_NM", "EXPNDTR_TOTAMT")),
    CHANGE_DISTRICT("VwsmSignguIxQq", AreaScope.DISTRICT, false, List.of(
        "SIGNGU_CD_NM", "TRDAR_CHNGE_IX", "TRDAR_CHNGE_IX_NM", "OPR_SALE_MT_AVRG", "CLS_SALE_MT_AVRG"));

    /** Categorical change indicator; validated against its code set instead of as a number. */
    public static final String CHANGE_INDICATOR_FIELD = "TRDAR_CHNGE_IX";

    /**
     * 원천이 끊겨 더 이상 게시할 수 없는 데이터셋의 마지막 유효 분기. 여기 없는 데이터셋은 상한이 없다.
     *
     * <p>{@code CONSUMPTION_COMMERCIAL} 은 2026-09-15 전수 실측에서 {@code 20241} 분기부터 모든 행의
     * 모든 지출 항목이 0 으로 확인됐다. 데이터셋 공지(OA-21278)도 "행정동보다 작은 상권크기의 데이터의
     * 제공이 어려워 더 이상 갱신되지 않습니다" 라고 밝힌다. 0 만 쌓는 슬롯을 만들지 않도록 여기서 막는다.
     */
    private static final Map<Dataset, Quarter> LAST_PUBLISHABLE_QUARTER =
        Map.of(CONSUMPTION_COMMERCIAL, new Quarter("20234"));

    private final String service;
    private final AreaScope scope;
    private final boolean industry;
    private final List<String> requiredMetrics;

    Dataset(String service, AreaScope scope, boolean industry, List<String> requiredMetrics) {
        this.service = service;
        this.scope = scope;
        this.industry = industry;
        this.requiredMetrics = requiredMetrics;
    }

    public String service() { return service; }
    public AreaScope scope() { return scope; }
    public String areaType() { return scope.name(); }
    public String areaField() { return scope.areaField(); }
    public boolean industry() { return industry; }
    public List<String> requiredMetrics() { return requiredMetrics; }

    public boolean changeIndicator() { return requiredMetrics.contains(CHANGE_INDICATOR_FIELD); }

    /** 이 분기까지만 게시할 수 있다. 비어 있으면 상한이 없다. */
    public Optional<Quarter> lastPublishableQuarter() { return Optional.ofNullable(LAST_PUBLISHABLE_QUARTER.get(this)); }

    public static Dataset parse(String value) {
        return valueOf(value.toUpperCase(Locale.ROOT));
    }
}
