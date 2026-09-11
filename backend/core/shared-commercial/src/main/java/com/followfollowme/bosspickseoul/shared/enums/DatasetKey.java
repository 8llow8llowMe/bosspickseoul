package com.followfollowme.bosspickseoul.shared.enums;

import java.util.Set;

/**
 * 분기 적재 배치가 게시하는 데이터셋 15종의 이름과, 그 payload 에서 이관 시 필수로 읽어야 하는 컬럼 코드.
 *
 * <p>batch-service 는 이 이름을 {@code dataset_release.dataset} / {@code dataset_active_release.dataset} 에 쓴다.
 * commercial-service 가 같은 이름으로 활성 release 를 찾던 조회 경로는 2026-09-10 제거됐으므로 현재 소비자는
 * batch-service(테스트 대조와 typed 이관)뿐이다. 공유 모듈에 두는 이유는 이관 대상 팩트 테이블의
 * 이름·필수 컬럼 계약을 서비스 간 경계에서 쓰기 때문이다.
 *
 * <p>{@code readerRequiredFields} 는 이관 대상 팩트 테이블이 NOT NULL 로 요구할 컬럼이다.
 * {@code CONSUMPTION_COMMERCIAL} 소득 두 컬럼과 {@code service_type} 은 원천에 없거나 파생이라 여기 두지 않는다.
 * batch-service 의 {@code DatasetTest} 가 {@code Dataset.requiredMetrics} 와의 포함 관계를 고정한다.
 */
public enum DatasetKey {

    SALES_COMMERCIAL(Set.of(
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
    STORE_COMMERCIAL(Set.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "STOR_CO", "SIMILR_INDUTY_STOR_CO", "OPBIZ_RT", "OPBIZ_STOR_CO", "CLSBIZ_RT", "CLSBIZ_STOR_CO", "FRC_STOR_CO")),
    FOOT_TRAFFIC_COMMERCIAL(Set.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM",
        "TOT_FLPOP_CO", "ML_FLPOP_CO", "FML_FLPOP_CO",
        "AGRDE_10_FLPOP_CO", "AGRDE_20_FLPOP_CO", "AGRDE_30_FLPOP_CO", "AGRDE_40_FLPOP_CO", "AGRDE_50_FLPOP_CO", "AGRDE_60_ABOVE_FLPOP_CO",
        "TMZON_00_06_FLPOP_CO", "TMZON_06_11_FLPOP_CO", "TMZON_11_14_FLPOP_CO", "TMZON_14_17_FLPOP_CO", "TMZON_17_21_FLPOP_CO",
        "TMZON_21_24_FLPOP_CO",
        "MON_FLPOP_CO", "TUES_FLPOP_CO", "WED_FLPOP_CO", "THUR_FLPOP_CO", "FRI_FLPOP_CO", "SAT_FLPOP_CO", "SUN_FLPOP_CO")),
    CHANGE_COMMERCIAL(Set.of("TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM")),
    POPULATION_COMMERCIAL(Set.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM",
        "TOT_REPOP_CO", "ML_REPOP_CO", "FML_REPOP_CO",
        "AGRDE_10_REPOP_CO", "AGRDE_20_REPOP_CO", "AGRDE_30_REPOP_CO", "AGRDE_40_REPOP_CO",
        "AGRDE_50_REPOP_CO", "AGRDE_60_ABOVE_REPOP_CO")),
    FACILITY_COMMERCIAL(Set.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM",
        "VIATR_FCLTY_CO", "ELESCH_CO", "MSKUL_CO", "HGSCHL_CO", "UNIV_CO", "SUBWAY_STATN_CO", "BUS_STTN_CO")),
    CONSUMPTION_COMMERCIAL(Set.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM", "EXPNDTR_TOTAMT",
        "FDSTFFS_EXPNDTR_TOTAMT", "CLTHS_FTWR_EXPNDTR_TOTAMT", "MCP_EXPNDTR_TOTAMT", "LVSPL_EXPNDTR_TOTAMT",
        "TRNSPORT_EXPNDTR_TOTAMT", "LSR_EXPNDTR_TOTAMT", "CLTUR_EXPNDTR_TOTAMT", "EDC_EXPNDTR_TOTAMT",
        "PLESR_EXPNDTR_TOTAMT")),
    SALES_ADMINISTRATION(Set.of(
        "ADSTRD_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "THSMON_SELNG_AMT", "MDWK_SELNG_AMT", "WKEND_SELNG_AMT")),
    STORE_ADMINISTRATION(Set.of(
        "ADSTRD_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "STOR_CO", "SIMILR_INDUTY_STOR_CO", "OPBIZ_RT", "OPBIZ_STOR_CO", "CLSBIZ_RT", "CLSBIZ_STOR_CO", "FRC_STOR_CO")),
    CONSUMPTION_ADMINISTRATION(Set.of("ADSTRD_CD_NM", "EXPNDTR_TOTAMT")),
    SALES_DISTRICT(Set.of(
        "SIGNGU_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "THSMON_SELNG_AMT",
        "MON_SELNG_AMT", "TUES_SELNG_AMT", "WED_SELNG_AMT", "THUR_SELNG_AMT", "FRI_SELNG_AMT", "SAT_SELNG_AMT", "SUN_SELNG_AMT",
        "TMZON_00_06_SELNG_AMT", "TMZON_06_11_SELNG_AMT", "TMZON_11_14_SELNG_AMT", "TMZON_14_17_SELNG_AMT",
        "TMZON_17_21_SELNG_AMT", "TMZON_21_24_SELNG_AMT",
        "ML_SELNG_AMT", "FML_SELNG_AMT",
        "AGRDE_10_SELNG_AMT", "AGRDE_20_SELNG_AMT", "AGRDE_30_SELNG_AMT", "AGRDE_40_SELNG_AMT",
        "AGRDE_50_SELNG_AMT", "AGRDE_60_ABOVE_SELNG_AMT")),
    STORE_DISTRICT(Set.of(
        "SIGNGU_CD_NM", "SVC_INDUTY_CD", "SVC_INDUTY_CD_NM",
        "STOR_CO", "SIMILR_INDUTY_STOR_CO", "OPBIZ_RT", "OPBIZ_STOR_CO", "CLSBIZ_RT", "CLSBIZ_STOR_CO", "FRC_STOR_CO")),
    FOOT_TRAFFIC_DISTRICT(Set.of(
        "SIGNGU_CD_NM",
        "TOT_FLPOP_CO", "ML_FLPOP_CO", "FML_FLPOP_CO",
        "AGRDE_10_FLPOP_CO", "AGRDE_20_FLPOP_CO", "AGRDE_30_FLPOP_CO", "AGRDE_40_FLPOP_CO", "AGRDE_50_FLPOP_CO",
        "AGRDE_60_ABOVE_FLPOP_CO",
        "TMZON_00_06_FLPOP_CO", "TMZON_06_11_FLPOP_CO", "TMZON_11_14_FLPOP_CO", "TMZON_14_17_FLPOP_CO",
        "TMZON_17_21_FLPOP_CO", "TMZON_21_24_FLPOP_CO",
        "MON_FLPOP_CO", "TUES_FLPOP_CO", "WED_FLPOP_CO", "THUR_FLPOP_CO", "FRI_FLPOP_CO", "SAT_FLPOP_CO", "SUN_FLPOP_CO")),
    CONSUMPTION_DISTRICT(Set.of("SIGNGU_CD_NM", "EXPNDTR_TOTAMT")),
    CHANGE_DISTRICT(Set.of(
        "SIGNGU_CD_NM", "TRDAR_CHNGE_IX", "TRDAR_CHNGE_IX_NM", "OPR_SALE_MT_AVRG", "CLS_SALE_MT_AVRG"));

    private final Set<String> readerRequiredFields;

    DatasetKey(Set<String> readerRequiredFields) {
        this.readerRequiredFields = readerRequiredFields;
    }

    /** 이관 대상 팩트 테이블이 payload 에서 필수로 읽는 컬럼 코드. 배치의 행 검증은 이 집합을 포함해야 한다. */
    public Set<String> readerRequiredFields() {
        return readerRequiredFields;
    }
}
