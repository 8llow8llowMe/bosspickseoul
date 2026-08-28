package com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.repository.custom;

import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.entity.PolicyEntity;
import java.time.LocalDate;
import java.util.List;

public interface PolicyCustomRepository {

    /**
     * 기준일에 신청 가능한 정책을 지역·업종 범위로 조회한다.
     *
     * <p>지역·업종 조건은 <b>동적</b>이다. null 이면 조건 자체가 where 에 들어가지 않는다.
     * JPQL 로 쓰면 {@code (:param IS NULL OR ...)} 가 조건 수만큼 늘어나므로 QueryDSL 로 조립한다.
     *
     * @param districtCode        자치구 코드. null 이면 지역 조건 없음
     * @param serviceCategoryCode 업종 대분류 접두어. null 이면 업종 조건 없음
     */
    List<PolicyEntity> findRecommendations(
        String districtCode, String serviceCategoryCode, LocalDate baseDate, int limit);
}
