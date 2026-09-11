package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import java.util.Map;

/**
 * {@code service_category} 의 업종 코드 → 업종 분류 매핑을 읽는다.
 *
 * <p>테이블이 수백 행 규모라 이관 run 시작 시 한 번만 통째로 읽어 메모리에 들고 간다.
 * 행 단위 조회를 하면 팩트 행 수만큼 왕복이 생긴다.
 */
public interface ServiceCategoryLookupPort {

    /** key 는 {@code service_code}, value 는 {@code service_type} enum 이름({@code RESTAURANT} 등). */
    Map<String, String> serviceTypesByServiceCode();
}
