package com.followfollowme.bosspickseoul.shared.enums;

/**
 * 분기 적재 배치가 게시하는 데이터셋 15종의 이름.
 *
 * <p>batch-service 는 이 이름을 {@code dataset_release.dataset} / {@code dataset_active_release.dataset} 에 쓰고,
 * commercial-service 는 같은 이름으로 활성 release 를 찾는다. 두 서비스가 문자열을 각자 적으면 오타가 조용히
 * "release 없음" 으로 새기 때문에 공유 모듈에 한 번만 둔다. batch-service 의 {@code Dataset} enum 은 이 이름과
 * 1:1 로 대응해야 하며 그 대응은 배치 테스트가 고정한다.
 */
public enum DatasetKey {

    SALES_COMMERCIAL,
    STORE_COMMERCIAL,
    FOOT_TRAFFIC_COMMERCIAL,
    CHANGE_COMMERCIAL,
    POPULATION_COMMERCIAL,
    FACILITY_COMMERCIAL,
    CONSUMPTION_COMMERCIAL,
    SALES_ADMINISTRATION,
    STORE_ADMINISTRATION,
    CONSUMPTION_ADMINISTRATION,
    SALES_DISTRICT,
    STORE_DISTRICT,
    FOOT_TRAFFIC_DISTRICT,
    CONSUMPTION_DISTRICT,
    CHANGE_DISTRICT
}
