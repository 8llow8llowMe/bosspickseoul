package com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.dto.item.PolicyItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "지원 정책 추천 응답 DTO")
public record PolicyRecommendationResponse(

    @Schema(description = "조회에 사용한 자치구 코드. null 이면 지역 조건 없이 조회", example = "11680")
    String districtCode,

    @Schema(description = "조회에 사용한 업종 대분류. null 이면 업종 조건 없이 조회", example = "CS1")
    String serviceCategoryCode,

    @Schema(description = "추천 정책 목록. 조건에 맞는 정책이 없으면 빈 배열")
    List<PolicyItem> policies
) {

}
