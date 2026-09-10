package com.followfollowme.bosspickseoul.shared.enums;

import java.util.Set;

/**
 * 분기 적재 배치가 게시하는 데이터셋 15종의 이름과, 그 payload 에서 이관 시 필수로 읽어야 하는 컬럼 코드.
 *
 * <p>batch-service 는 이 이름을 {@code dataset_release.dataset} / {@code dataset_active_release.dataset} 에 쓴다.
 * commercial-service 가 같은 이름으로 활성 release 를 찾던 조회 경로는 2026-09-10 제거됐으므로 현재 소비자는
 * batch-service(테스트 대조)뿐이다. 그래도 공유 모듈에 두는 이유는, 적재분을 기존 팩트 테이블로 이관하는 후속 작업이
 * 이 이름·필수 컬럼 계약을 다시 서비스 간 경계에서 쓰기 때문이다. 두 서비스가 문자열을 각자 적으면 오타가 조용히
 * "release 없음" 으로 샌다.
 *
 * <p>{@code readerRequiredFields} 는 이관 대상 팩트 테이블이 NOT NULL 로 요구할 컬럼이다. 배치의 행 검증({@code Dataset.requiredMetrics})
 * 이 이 집합을 포함해야 게시 단계에서 결손 행이 걸러지고, 이관 때 결손 행이 그대로 넘어오지 않는다.
 * batch-service 의 {@code DatasetTest} 가 이 포함 관계를 고정한다. 아직 계약을 정하지 않은 데이터셋은 빈 집합이다.
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
