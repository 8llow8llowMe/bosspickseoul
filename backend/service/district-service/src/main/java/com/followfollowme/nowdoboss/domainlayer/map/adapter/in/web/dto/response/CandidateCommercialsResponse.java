package com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item.CandidateCommercialItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "후보 상권 응답")
public record CandidateCommercialsResponse(

    @Schema(description = "후보 상권 목록 (복합 점수 내림차순)")
    List<CandidateCommercialItem> items
) {

}
