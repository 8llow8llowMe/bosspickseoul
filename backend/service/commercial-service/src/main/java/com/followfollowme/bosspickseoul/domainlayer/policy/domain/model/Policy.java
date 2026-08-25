package com.followfollowme.bosspickseoul.domainlayer.policy.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.policy.domain.enums.PolicySupportType;
import java.time.LocalDate;
import lombok.Builder;

/**
 * 소상공인 지원 정책.
 *
 * <p>지역·업종 범위는 <b>null 이 "제한 없음"</b>을 뜻한다. 전국 정책은 {@code districtCode} 가 null 이고,
 * 전업종 정책은 {@code serviceCategoryCode} 가 null 이다. 별도 "전체" 코드를 두지 않은 이유는,
 * 그런 값을 두면 조회 조건이 "특정 자치구 OR 전체코드" 두 갈래로 갈라져 인덱스와 쿼리가 복잡해지기 때문이다.
 *
 * @param districtCode        지원 대상 자치구 코드. null 이면 서울 전역/전국
 * @param serviceCategoryCode 지원 대상 업종 대분류(`CS1` 같은 접두어). null 이면 전업종
 * @param applyEndAt          신청 마감일. null 이면 상시 모집
 */
@Builder
public record Policy(
    long id,
    String title,
    String organization,
    PolicySupportType supportType,
    String targetSummary,
    String supportContent,
    String districtCode,
    String serviceCategoryCode,
    LocalDate applyStartAt,
    LocalDate applyEndAt,
    String detailUrl
) {

    /**
     * 기준일에 신청할 수 있는지 여부. 상시 모집(마감일 없음)은 항상 true 다.
     */
    public boolean isOpenOn(LocalDate baseDate) {
        if (applyStartAt != null && baseDate.isBefore(applyStartAt)) {
            return false;
        }
        return applyEndAt == null || !baseDate.isAfter(applyEndAt);
    }

    /**
     * 특정 자치구를 콕 집은 정책인지. 추천 정렬에서 전국 정책보다 앞에 두기 위해 쓴다.
     */
    public boolean isDistrictSpecific() {
        return districtCode != null;
    }
}
