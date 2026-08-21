package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "행정동 지출 상세 응답")
public record AdministrationIncomeDetailResponse(
    @Schema(description = "총 지출 금액")
    long totalExpenseAmount
) {

}
