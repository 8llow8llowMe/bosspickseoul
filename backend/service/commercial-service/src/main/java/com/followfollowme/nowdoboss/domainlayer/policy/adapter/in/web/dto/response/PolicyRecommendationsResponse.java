package com.followfollowme.nowdoboss.domainlayer.policy.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.policy.adapter.in.web.dto.item.PolicyRecommendationItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "정책 추천 응답 DTO")
public record PolicyRecommendationsResponse(
    @Schema(description = "정책 추천 목록")
    List<PolicyRecommendationItem> policies
) {

}
