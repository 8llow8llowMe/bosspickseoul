package com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model;

import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.Set;

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
 * <p>One dataset is discontinued rather than merely reshaped: see {@link #DISCONTINUED_SOURCES}.
 */
public enum Dataset {
    SALES_COMMERCIAL(DatasetKey.SALES_COMMERCIAL, AreaScope.COMMERCIAL, true, List.of(
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
    STORE_COMMERCIAL(DatasetKey.STORE_COMMERCIAL, AreaScope.COMMERCIAL, true, List.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "STOR_CO", "SIMILR_INDUTY_STOR_CO", "OPBIZ_RT", "OPBIZ_STOR_CO", "CLSBIZ_RT", "CLSBIZ_STOR_CO", "FRC_STOR_CO")),
    // 이관 대상 팩트 테이블이 NOT NULL 로 요구할 컬럼(shared DatasetKey.readerRequiredFields)을 게시 단계에서 전부 요구한다.
    // 여기서 걸러야 결손 행이 게시돼 이관 때 그대로 넘어오는 일이 없다. 조회 측 매퍼는 2026-09-10 제거됐고,
    // DatasetTest 가 DatasetKey 와의 포함 관계를 계속 고정한다.
    FOOT_TRAFFIC_COMMERCIAL(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, AreaScope.COMMERCIAL, false, List.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM",
        "TOT_FLPOP_CO", "ML_FLPOP_CO", "FML_FLPOP_CO",
        "AGRDE_10_FLPOP_CO", "AGRDE_20_FLPOP_CO", "AGRDE_30_FLPOP_CO", "AGRDE_40_FLPOP_CO", "AGRDE_50_FLPOP_CO", "AGRDE_60_ABOVE_FLPOP_CO",
        "TMZON_00_06_FLPOP_CO", "TMZON_06_11_FLPOP_CO", "TMZON_11_14_FLPOP_CO", "TMZON_14_17_FLPOP_CO", "TMZON_17_21_FLPOP_CO",
        "TMZON_21_24_FLPOP_CO",
        "MON_FLPOP_CO", "TUES_FLPOP_CO", "WED_FLPOP_CO", "THUR_FLPOP_CO", "FRI_FLPOP_CO", "SAT_FLPOP_CO", "SUN_FLPOP_CO")),
    CHANGE_COMMERCIAL(DatasetKey.CHANGE_COMMERCIAL, AreaScope.COMMERCIAL, false, List.of(
        "TRDAR_CHNGE_IX", "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM")),
    POPULATION_COMMERCIAL(DatasetKey.POPULATION_COMMERCIAL, AreaScope.COMMERCIAL, false, List.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM",
        "TOT_REPOP_CO", "ML_REPOP_CO", "FML_REPOP_CO",
        "AGRDE_10_REPOP_CO", "AGRDE_20_REPOP_CO", "AGRDE_30_REPOP_CO", "AGRDE_40_REPOP_CO",
        "AGRDE_50_REPOP_CO", "AGRDE_60_ABOVE_REPOP_CO")),
    FACILITY_COMMERCIAL(DatasetKey.FACILITY_COMMERCIAL, AreaScope.COMMERCIAL, false, List.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM",
        "VIATR_FCLTY_CO", "ELESCH_CO", "MSKUL_CO", "HGSCHL_CO", "UNIV_CO", "SUBWAY_STATN_CO", "BUS_STTN_CO")),
    CONSUMPTION_COMMERCIAL(DatasetKey.CONSUMPTION_COMMERCIAL, AreaScope.COMMERCIAL, false, List.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM", "EXPNDTR_TOTAMT",
        "FDSTFFS_EXPNDTR_TOTAMT", "CLTHS_FTWR_EXPNDTR_TOTAMT", "MCP_EXPNDTR_TOTAMT", "LVSPL_EXPNDTR_TOTAMT",
        "TRNSPORT_EXPNDTR_TOTAMT", "LSR_EXPNDTR_TOTAMT", "CLTUR_EXPNDTR_TOTAMT", "EDC_EXPNDTR_TOTAMT",
        "PLESR_EXPNDTR_TOTAMT")),
    SALES_ADMINISTRATION(DatasetKey.SALES_ADMINISTRATION, AreaScope.ADMINISTRATION, true, List.of(
        "ADSTRD_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "THSMON_SELNG_AMT", "MDWK_SELNG_AMT", "WKEND_SELNG_AMT")),
    STORE_ADMINISTRATION(DatasetKey.STORE_ADMINISTRATION, AreaScope.ADMINISTRATION, true, List.of(
        "ADSTRD_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "STOR_CO", "SIMILR_INDUTY_STOR_CO", "OPBIZ_RT", "OPBIZ_STOR_CO", "CLSBIZ_RT", "CLSBIZ_STOR_CO", "FRC_STOR_CO")),
    // 상권 소비(CONSUMPTION_COMMERCIAL)가 20241 부터 전 행 0 이라 행정동 소비를 대체 원천으로 쓴다(이슈 #415).
    // 그래서 총액뿐 아니라 세부 10항목을 게시 단계에서 전부 요구한다. 2026-09-17 Open API 전수 호출에서
    // 425개 행정동 × 22분기(20211~20262) 모두 11개 금액 필드가 존재했고 누락은 0건이었다. 0 은 있어도(최대 3.1%, 유흥)
    // 값이 빈 행은 없었으므로 필수로 두는 쪽이 결손 행을 게시 전에 잡는다.
    // 항목 구성은 상권(9항목)과 다르다. 여가·문화가 LSR_CLTUR_EXPNDTR_TOTAMT 로 합쳐져 있고 기타·음식이 더 있다.
    // 원천에 없는 분해를 만들지 않으므로 행정동 스키마 그대로 적재한다.
    CONSUMPTION_ADMINISTRATION(DatasetKey.CONSUMPTION_ADMINISTRATION, AreaScope.ADMINISTRATION, false, List.of(
        "ADSTRD_CD_NM", "EXPNDTR_TOTAMT",
        "FDSTFFS_EXPNDTR_TOTAMT", "CLTHS_FTWR_EXPNDTR_TOTAMT", "LVSPL_EXPNDTR_TOTAMT", "MCP_EXPNDTR_TOTAMT",
        "TRNSPORT_EXPNDTR_TOTAMT", "EDC_EXPNDTR_TOTAMT", "PLESR_EXPNDTR_TOTAMT", "LSR_CLTUR_EXPNDTR_TOTAMT",
        "ETC_EXPNDTR_TOTAMT", "FD_EXPNDTR_TOTAMT")),
    SALES_DISTRICT(DatasetKey.SALES_DISTRICT, AreaScope.DISTRICT, true, List.of(
        "SIGNGU_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "THSMON_SELNG_AMT",
        "MON_SELNG_AMT", "TUES_SELNG_AMT", "WED_SELNG_AMT", "THUR_SELNG_AMT", "FRI_SELNG_AMT", "SAT_SELNG_AMT", "SUN_SELNG_AMT",
        "TMZON_00_06_SELNG_AMT", "TMZON_06_11_SELNG_AMT", "TMZON_11_14_SELNG_AMT", "TMZON_14_17_SELNG_AMT",
        "TMZON_17_21_SELNG_AMT", "TMZON_21_24_SELNG_AMT",
        "ML_SELNG_AMT", "FML_SELNG_AMT",
        "AGRDE_10_SELNG_AMT", "AGRDE_20_SELNG_AMT", "AGRDE_30_SELNG_AMT", "AGRDE_40_SELNG_AMT",
        "AGRDE_50_SELNG_AMT", "AGRDE_60_ABOVE_SELNG_AMT")),
    STORE_DISTRICT(DatasetKey.STORE_DISTRICT, AreaScope.DISTRICT, true, List.of(
        "SIGNGU_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "STOR_CO", "SIMILR_INDUTY_STOR_CO", "OPBIZ_RT", "OPBIZ_STOR_CO", "CLSBIZ_RT", "CLSBIZ_STOR_CO", "FRC_STOR_CO")),
    FOOT_TRAFFIC_DISTRICT(DatasetKey.FOOT_TRAFFIC_DISTRICT, AreaScope.DISTRICT, false, List.of(
        "SIGNGU_CD_NM",
        "TOT_FLPOP_CO", "ML_FLPOP_CO", "FML_FLPOP_CO",
        "AGRDE_10_FLPOP_CO", "AGRDE_20_FLPOP_CO", "AGRDE_30_FLPOP_CO", "AGRDE_40_FLPOP_CO", "AGRDE_50_FLPOP_CO",
        "AGRDE_60_ABOVE_FLPOP_CO",
        "TMZON_00_06_FLPOP_CO", "TMZON_06_11_FLPOP_CO", "TMZON_11_14_FLPOP_CO", "TMZON_14_17_FLPOP_CO",
        "TMZON_17_21_FLPOP_CO", "TMZON_21_24_FLPOP_CO",
        "MON_FLPOP_CO", "TUES_FLPOP_CO", "WED_FLPOP_CO", "THUR_FLPOP_CO", "FRI_FLPOP_CO", "SAT_FLPOP_CO", "SUN_FLPOP_CO")),
    CONSUMPTION_DISTRICT(DatasetKey.CONSUMPTION_DISTRICT, AreaScope.DISTRICT, false, List.of(
        "SIGNGU_CD_NM", "EXPNDTR_TOTAMT")),
    CHANGE_DISTRICT(DatasetKey.CHANGE_DISTRICT, AreaScope.DISTRICT, false, List.of(
        "SIGNGU_CD_NM", "TRDAR_CHNGE_IX", "TRDAR_CHNGE_IX_NM", "OPR_SALE_MT_AVRG", "CLS_SALE_MT_AVRG"));

    /** Categorical change indicator; validated against its code set instead of as a number. */
    public static final String CHANGE_INDICATOR_FIELD = "TRDAR_CHNGE_IX";

    /**
     * 원천이 끊겨 더 이상 게시할 수 없는 데이터셋. 여기 없는 데이터셋은 상한이 없다.
     *
     * <p>중단 사유를 값에 함께 담는다. 사유는 데이터셋마다 다를 수 있으므로(컬럼 삭제 · 전 행 0 · 서비스 폐지)
     * 예외 메시지가 한 가지 사유를 사실처럼 못 박으면 다음 데이터셋을 등록할 때 그 문장이 거짓말이 된다.
     */
    private static final Map<Dataset, DiscontinuedSource> DISCONTINUED_SOURCES = Map.of(
        CONSUMPTION_COMMERCIAL, new DiscontinuedSource(new Quarter("20234"),
            "2026-09-15 전수 실측에서 20241 분기부터 모든 행의 모든 지출 항목이 0 이었고, "
                + "데이터셋 공지(OA-21278)도 상권 단위 제공 중단을 밝힌다"));

    /**
     * Open API 가 분기 경로 인자를 존중하는 데이터셋. 여기 없는 9종은 인자를 무시하고 2021 년 이후 전 기간을 돌려준다.
     *
     * <p>2026-09-08 실호출로 확인한 값이고, {@code scripts/batch/quarterly-import-plan.ps1} 의 {@code HonorsPeriod} 와
     * {@code quarterly-import-coverage.sql} 의 {@code period_arg} 가 같은 목록을 따로 적는다. 셋이 어긋나지 않게
     * {@code DatasetTest} 가 두 파일을 읽어 대조한다.
     */
    private static final Set<Dataset> QUARTER_ARGUMENT_HONOURED = EnumSet.of(
        CHANGE_COMMERCIAL, FOOT_TRAFFIC_COMMERCIAL, SALES_ADMINISTRATION, SALES_COMMERCIAL, STORE_ADMINISTRATION, STORE_COMMERCIAL);

    /**
     * 분기마다 행 수가 같은 데이터셋. CHANGE_COMMERCIAL 1650 은 게시 run 으로 확인했고, 자치구 3종은 25개 구 × 1행이다.
     * 업종이 붙는 자치구 데이터셋(SALES/STORE_DISTRICT)은 업종 수가 분기마다 달라 여기 없다. ps1 {@code FixedRows} 와 같다.
     */
    private static final Map<Dataset, Long> FIXED_ROWS_PER_QUARTER = Map.of(
        CHANGE_COMMERCIAL, 1650L,
        CHANGE_DISTRICT, 25L,
        FOOT_TRAFFIC_DISTRICT, 25L,
        CONSUMPTION_DISTRICT, 25L);

    /**
     * 적재 순서. 작고 고정 행 수인 데이터셋을 먼저 돌려 원천·공간 이상을 싸게 발견하고, 가장 큰 STORE_COMMERCIAL 을 마지막에 둔다.
     * ps1 {@code Order} 와 coverage.sql {@code run_order} 와 같다.
     */
    private static final List<Dataset> RUN_ORDER = List.of(
        CHANGE_COMMERCIAL, CHANGE_DISTRICT, FOOT_TRAFFIC_DISTRICT, CONSUMPTION_DISTRICT, FOOT_TRAFFIC_COMMERCIAL,
        POPULATION_COMMERCIAL, FACILITY_COMMERCIAL, CONSUMPTION_COMMERCIAL, CONSUMPTION_ADMINISTRATION, SALES_DISTRICT,
        STORE_DISTRICT, SALES_ADMINISTRATION, SALES_COMMERCIAL, STORE_ADMINISTRATION, STORE_COMMERCIAL);

    /** 중단된 원천의 마지막 게시 가능 분기와 그 사유. */
    public record DiscontinuedSource(Quarter lastPublishableQuarter, String reason) {
    }

    private final DatasetKey key;
    private final AreaScope scope;
    private final boolean industry;
    private final List<String> requiredMetrics;

    Dataset(DatasetKey key, AreaScope scope, boolean industry, List<String> requiredMetrics) {
        this.key = key;
        this.scope = scope;
        this.industry = industry;
        this.requiredMetrics = requiredMetrics;
    }

    /** 공유 모듈의 데이터셋 계약. 이름과 Open API 서비스명의 정본은 여기 하나다. */
    public DatasetKey key() { return key; }

    /**
     * Open API 서비스명. 문자열을 여기 다시 적지 않고 {@link DatasetKey} 에서 읽는다 — 포털이 데이터셋을
     * 재게시하면 배치만 고쳐도 배치는 돌아가는데, 같은 이름을 출처로 인용하는 commercial-service 는
     * 죽은 ID 를 계속 내보내기 때문이다. (이슈 #415)
     */
    public String service() { return key.openApiService(); }
    public AreaScope scope() { return scope; }
    public String areaType() { return scope.name(); }
    public String areaField() { return scope.areaField(); }
    public boolean industry() { return industry; }
    public List<String> requiredMetrics() { return requiredMetrics; }

    public boolean changeIndicator() { return requiredMetrics.contains(CHANGE_INDICATOR_FIELD); }

    /** Open API 가 분기 경로 인자를 존중하면 true. false 면 어떤 분기를 요청해도 전 기간이 온다. */
    public boolean quarterArgumentHonoured() { return QUARTER_ARGUMENT_HONOURED.contains(this); }

    /** 분기마다 고정인 행 수. 비어 있으면 분기마다 달라 직전 분기 대비 허용 오차로 판단한다. */
    public OptionalLong fixedRowsPerQuarter() {
        Long rows = FIXED_ROWS_PER_QUARTER.get(this);
        return rows == null ? OptionalLong.empty() : OptionalLong.of(rows);
    }

    /** 1부터 시작하는 적재 순서. */
    public int runOrder() { return RUN_ORDER.indexOf(this) + 1; }

    /** 적재 순서대로 정렬한 전 데이터셋. */
    public static List<Dataset> inRunOrder() { return RUN_ORDER; }

    /** 원천이 끊긴 데이터셋이면 그 상한과 사유. 비어 있으면 상한이 없다. */
    public Optional<DiscontinuedSource> discontinuedSource() { return Optional.ofNullable(DISCONTINUED_SOURCES.get(this)); }

    /** 이 분기까지만 게시할 수 있다. 비어 있으면 상한이 없다. */
    public Optional<Quarter> lastPublishableQuarter() { return discontinuedSource().map(DiscontinuedSource::lastPublishableQuarter); }

    /**
     * 게시 상한을 넘는 분기면 거부한다.
     *
     * <p>규칙 본문이 여기 있으니 검사도 여기 둔다. 사실 적재({@code ImportRequest})만 막으면
     * 이미 스테이징된 릴리스를 {@code --job=project}({@code ProjectionRequest})로 재투영해
     * 0 행이 다시 팩트 테이블에 들어간다. 실제로 팩트 테이블에 INSERT 하는 것은 그쪽이다.
     */
    public void assertPublishable(Quarter period) {
        DiscontinuedSource discontinued = DISCONTINUED_SOURCES.get(this);
        if (discontinued == null || period.compareTo(discontinued.lastPublishableQuarter()) <= 0) {
            return;
        }
        throw new IllegalArgumentException("Source discontinued after %s for %s: %s"
            .formatted(discontinued.lastPublishableQuarter().value(), this, discontinued.reason()));
    }

    public static Dataset parse(String value) {
        return valueOf(value.toUpperCase(Locale.ROOT));
    }
}
