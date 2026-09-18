package com.followfollowme.bosspickseoul.shared.enums;

import java.util.Set;

/**
 * 분기 적재 배치가 게시하는 데이터셋 15종의 이름과, 그 payload 에서 이관 시 필수로 읽어야 하는 컬럼 코드.
 *
 * <p>batch-service 는 이 이름을 {@code dataset_release.dataset} / {@code dataset_active_release.dataset} 에 쓰고,
 * {@link #openApiService()} 로 Open API 를 호출한다. commercial-service 는 같은 {@code openApiService} 를 소비
 * 지표의 출처 식별자로 응답에 싣는다(이슈 #415). 공유 모듈에 두는 이유는 데이터셋 이름·Open API 서비스명·필수
 * 컬럼 계약이 두 서비스에 걸쳐 있기 때문이다 — 서비스마다 복사하면 포털 재게시 때 한쪽만 고쳐진다.
 *
 * <p>{@code readerRequiredFields} 는 이관 대상 팩트 테이블이 NOT NULL 로 요구할 컬럼이다.
 * {@code CONSUMPTION_COMMERCIAL} 소득 두 컬럼과 {@code service_type} 은 원천에 없거나 파생이라 여기 두지 않는다.
 * batch-service 의 {@code DatasetTest} 가 {@code Dataset.requiredMetrics} 와의 포함 관계를 고정한다.
 */
public enum DatasetKey {

    SALES_COMMERCIAL("VwsmTrdarSelngQq", Set.of(
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
    STORE_COMMERCIAL("VwsmTrdarStorQq", Set.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "STOR_CO", "SIMILR_INDUTY_STOR_CO", "OPBIZ_RT", "OPBIZ_STOR_CO", "CLSBIZ_RT", "CLSBIZ_STOR_CO", "FRC_STOR_CO")),
    FOOT_TRAFFIC_COMMERCIAL("VwsmTrdarFlpopQq", Set.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM",
        "TOT_FLPOP_CO", "ML_FLPOP_CO", "FML_FLPOP_CO",
        "AGRDE_10_FLPOP_CO", "AGRDE_20_FLPOP_CO", "AGRDE_30_FLPOP_CO", "AGRDE_40_FLPOP_CO", "AGRDE_50_FLPOP_CO", "AGRDE_60_ABOVE_FLPOP_CO",
        "TMZON_00_06_FLPOP_CO", "TMZON_06_11_FLPOP_CO", "TMZON_11_14_FLPOP_CO", "TMZON_14_17_FLPOP_CO", "TMZON_17_21_FLPOP_CO",
        "TMZON_21_24_FLPOP_CO",
        "MON_FLPOP_CO", "TUES_FLPOP_CO", "WED_FLPOP_CO", "THUR_FLPOP_CO", "FRI_FLPOP_CO", "SAT_FLPOP_CO", "SUN_FLPOP_CO")),
    CHANGE_COMMERCIAL("VwsmTrdarIxQq", Set.of("TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM")),
    POPULATION_COMMERCIAL("VwsmTrdarRepopQq", Set.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM",
        "TOT_REPOP_CO", "ML_REPOP_CO", "FML_REPOP_CO",
        "AGRDE_10_REPOP_CO", "AGRDE_20_REPOP_CO", "AGRDE_30_REPOP_CO", "AGRDE_40_REPOP_CO",
        "AGRDE_50_REPOP_CO", "AGRDE_60_ABOVE_REPOP_CO")),
    FACILITY_COMMERCIAL("VwsmTrdarFcltyQq", Set.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM",
        "VIATR_FCLTY_CO", "ELESCH_CO", "MSKUL_CO", "HGSCHL_CO", "UNIV_CO", "SUBWAY_STATN_CO", "BUS_STTN_CO")),
    CONSUMPTION_COMMERCIAL("VwsmTrdhlNcmCnsmpQq", Set.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM", "EXPNDTR_TOTAMT",
        "FDSTFFS_EXPNDTR_TOTAMT", "CLTHS_FTWR_EXPNDTR_TOTAMT", "MCP_EXPNDTR_TOTAMT", "LVSPL_EXPNDTR_TOTAMT",
        "TRNSPORT_EXPNDTR_TOTAMT", "LSR_EXPNDTR_TOTAMT", "CLTUR_EXPNDTR_TOTAMT", "EDC_EXPNDTR_TOTAMT",
        "PLESR_EXPNDTR_TOTAMT")),
    SALES_ADMINISTRATION("VwsmAdstrdSelngW", Set.of(
        "ADSTRD_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "THSMON_SELNG_AMT", "MDWK_SELNG_AMT", "WKEND_SELNG_AMT")),
    STORE_ADMINISTRATION("VwsmAdstrdStorW", Set.of(
        "ADSTRD_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "STOR_CO", "SIMILR_INDUTY_STOR_CO", "OPBIZ_RT", "OPBIZ_STOR_CO", "CLSBIZ_RT", "CLSBIZ_STOR_CO", "FRC_STOR_CO")),
    // 행정동 소비는 상권 소비가 끊긴 뒤의 대체 원천이라 총액 + 세부 10항목을 모두 읽는다(이슈 #415).
    // 여가·문화는 합산(LSR_CLTUR)이고 기타·음식이 더 있어 상권 9항목과 구성이 다르다.
    CONSUMPTION_ADMINISTRATION("VwsmAdstrdNcmCnsmpW", Set.of(
        "ADSTRD_CD_NM", "EXPNDTR_TOTAMT",
        "FDSTFFS_EXPNDTR_TOTAMT", "CLTHS_FTWR_EXPNDTR_TOTAMT", "LVSPL_EXPNDTR_TOTAMT", "MCP_EXPNDTR_TOTAMT",
        "TRNSPORT_EXPNDTR_TOTAMT", "EDC_EXPNDTR_TOTAMT", "PLESR_EXPNDTR_TOTAMT", "LSR_CLTUR_EXPNDTR_TOTAMT",
        "ETC_EXPNDTR_TOTAMT", "FD_EXPNDTR_TOTAMT")),
    SALES_DISTRICT("VwsmSignguSelngW", Set.of(
        "SIGNGU_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "THSMON_SELNG_AMT",
        "MON_SELNG_AMT", "TUES_SELNG_AMT", "WED_SELNG_AMT", "THUR_SELNG_AMT", "FRI_SELNG_AMT", "SAT_SELNG_AMT", "SUN_SELNG_AMT",
        "TMZON_00_06_SELNG_AMT", "TMZON_06_11_SELNG_AMT", "TMZON_11_14_SELNG_AMT", "TMZON_14_17_SELNG_AMT",
        "TMZON_17_21_SELNG_AMT", "TMZON_21_24_SELNG_AMT",
        "ML_SELNG_AMT", "FML_SELNG_AMT",
        "AGRDE_10_SELNG_AMT", "AGRDE_20_SELNG_AMT", "AGRDE_30_SELNG_AMT", "AGRDE_40_SELNG_AMT",
        "AGRDE_50_SELNG_AMT", "AGRDE_60_ABOVE_SELNG_AMT")),
    STORE_DISTRICT("VwsmSignguStorW", Set.of(
        "SIGNGU_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "STOR_CO", "SIMILR_INDUTY_STOR_CO", "OPBIZ_RT", "OPBIZ_STOR_CO", "CLSBIZ_RT", "CLSBIZ_STOR_CO", "FRC_STOR_CO")),
    FOOT_TRAFFIC_DISTRICT("VwsmSignguFlpopW", Set.of(
        "SIGNGU_CD_NM",
        "TOT_FLPOP_CO", "ML_FLPOP_CO", "FML_FLPOP_CO",
        "AGRDE_10_FLPOP_CO", "AGRDE_20_FLPOP_CO", "AGRDE_30_FLPOP_CO", "AGRDE_40_FLPOP_CO", "AGRDE_50_FLPOP_CO",
        "AGRDE_60_ABOVE_FLPOP_CO",
        "TMZON_00_06_FLPOP_CO", "TMZON_06_11_FLPOP_CO", "TMZON_11_14_FLPOP_CO", "TMZON_14_17_FLPOP_CO",
        "TMZON_17_21_FLPOP_CO", "TMZON_21_24_FLPOP_CO",
        "MON_FLPOP_CO", "TUES_FLPOP_CO", "WED_FLPOP_CO", "THUR_FLPOP_CO", "FRI_FLPOP_CO", "SAT_FLPOP_CO", "SUN_FLPOP_CO")),
    CONSUMPTION_DISTRICT("VwsmSignguNcmCnsmpW", Set.of("SIGNGU_CD_NM", "EXPNDTR_TOTAMT")),
    CHANGE_DISTRICT("VwsmSignguIxQq", Set.of(
        "SIGNGU_CD_NM", "TRDAR_CHNGE_IX", "TRDAR_CHNGE_IX_NM", "OPR_SALE_MT_AVRG", "CLS_SALE_MT_AVRG"));

    private final String openApiService;
    private final Set<String> readerRequiredFields;

    DatasetKey(String openApiService, Set<String> readerRequiredFields) {
        this.openApiService = openApiService;
        this.readerRequiredFields = readerRequiredFields;
    }

    /**
     * 서울 열린데이터광장 Open API 서비스명. 이 데이터셋의 <b>식별자 정본</b>이다.
     *
     * <p>batch-service 는 이 이름으로 API 를 호출하고, commercial-service 는 같은 이름을 소비 지표의 출처
     * ({@code sourceId})로 응답에 싣는다. 서비스마다 문자열을 복사해 두면 포털이 데이터셋을 재게시했을 때
     * 배치만 고쳐도 배치는 돌아가고, 조회 쪽은 <b>죽은 데이터셋 ID 를 출처로 계속 인용한다.</b>
     * 이 프로젝트는 소비-상권배후지 재게시에서 이미 한 번 겪었다.
     */
    public String openApiService() {
        return openApiService;
    }

    /** 이관 대상 팩트 테이블이 payload 에서 필수로 읽는 컬럼 코드. 배치의 행 검증은 이 집합을 포함해야 한다. */
    public Set<String> readerRequiredFields() {
        return readerRequiredFields;
    }
}
