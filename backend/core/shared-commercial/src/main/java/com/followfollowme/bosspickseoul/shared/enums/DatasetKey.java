package com.followfollowme.bosspickseoul.shared.enums;

import java.util.Set;

/**
 * 분기 적재 배치가 게시하는 데이터셋 15종의 이름과, 조회 서비스가 그 payload 에서 필수로 읽는 컬럼 코드.
 *
 * <p>batch-service 는 이 이름을 {@code dataset_release.dataset} / {@code dataset_active_release.dataset} 에 쓰고,
 * commercial-service 는 같은 이름으로 활성 release 를 찾는다. 두 서비스가 문자열을 각자 적으면 오타가 조용히
 * "release 없음" 으로 새기 때문에 공유 모듈에 한 번만 둔다.
 *
 * <p>{@code readerRequiredFields} 는 조회 서비스의 매퍼가 fail-closed 로 요구하는 컬럼이다. 배치의 행 검증({@code Dataset.requiredMetrics})
 * 이 이 집합을 포함해야 게시 단계에서 결손 행이 걸러지고, 게시 뒤 조회가 한 분기 전체를 500 으로 만들지 않는다.
 * 두 쪽 모두 테스트로 이 집합과 대조한다. 아직 조회 경로가 없는 데이터셋은 빈 집합이다.
 */
public enum DatasetKey {

    SALES_COMMERCIAL(Set.of()),
    STORE_COMMERCIAL(Set.of()),
    FOOT_TRAFFIC_COMMERCIAL(Set.of(
        "TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM",
        "TOT_FLPOP_CO", "ML_FLPOP_CO", "FML_FLPOP_CO",
        "AGRDE_10_FLPOP_CO", "AGRDE_20_FLPOP_CO", "AGRDE_30_FLPOP_CO", "AGRDE_40_FLPOP_CO", "AGRDE_50_FLPOP_CO", "AGRDE_60_ABOVE_FLPOP_CO",
        "TMZON_00_06_FLPOP_CO", "TMZON_06_11_FLPOP_CO", "TMZON_11_14_FLPOP_CO", "TMZON_14_17_FLPOP_CO", "TMZON_17_21_FLPOP_CO",
        "TMZON_21_24_FLPOP_CO",
        "MON_FLPOP_CO", "TUES_FLPOP_CO", "WED_FLPOP_CO", "THUR_FLPOP_CO", "FRI_FLPOP_CO", "SAT_FLPOP_CO", "SUN_FLPOP_CO")),
    CHANGE_COMMERCIAL(Set.of("TRDAR_SE_CD", "TRDAR_SE_CD_NM", "TRDAR_CD_NM")),
    POPULATION_COMMERCIAL(Set.of()),
    FACILITY_COMMERCIAL(Set.of()),
    CONSUMPTION_COMMERCIAL(Set.of()),
    SALES_ADMINISTRATION(Set.of()),
    STORE_ADMINISTRATION(Set.of()),
    CONSUMPTION_ADMINISTRATION(Set.of()),
    SALES_DISTRICT(Set.of()),
    STORE_DISTRICT(Set.of()),
    FOOT_TRAFFIC_DISTRICT(Set.of()),
    CONSUMPTION_DISTRICT(Set.of()),
    CHANGE_DISTRICT(Set.of());

    private final Set<String> readerRequiredFields;

    DatasetKey(Set<String> readerRequiredFields) {
        this.readerRequiredFields = readerRequiredFields;
    }

    /** 조회 서비스가 payload 에서 필수로 읽는 컬럼 코드. 배치의 행 검증은 이 집합을 포함해야 한다. */
    public Set<String> readerRequiredFields() {
        return readerRequiredFields;
    }
}
