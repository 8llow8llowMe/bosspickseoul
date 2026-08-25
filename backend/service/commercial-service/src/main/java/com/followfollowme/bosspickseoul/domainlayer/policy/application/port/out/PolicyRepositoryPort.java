package com.followfollowme.bosspickseoul.domainlayer.policy.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.policy.domain.model.Policy;
import java.time.LocalDate;
import java.util.List;

public interface PolicyRepositoryPort {

    /**
     * 조건에 맞는 신청 가능 정책을 정렬해서 최대 {@code limit} 건 조회한다.
     *
     * <p>지역·업종은 <b>범위 포함</b>으로 매칭한다. 즉 자치구를 지정하면 그 자치구 전용 정책과
     * 지역 제한이 없는 정책이 함께 나온다. 업종도 같다. 사용자는 "내가 받을 수 있는 것"을 보고 싶지,
     * "내 자치구에만 있는 것"을 보고 싶은 게 아니기 때문이다.
     *
     * @param districtCode        자치구 코드. null 이면 지역 조건 없이 조회
     * @param serviceCategoryCode 업종 대분류 접두어. null 이면 업종 조건 없이 조회
     * @param baseDate            신청 가능 여부 판단 기준일
     */
    List<Policy> findRecommendations(String districtCode, String serviceCategoryCode, LocalDate baseDate, int limit);
}
