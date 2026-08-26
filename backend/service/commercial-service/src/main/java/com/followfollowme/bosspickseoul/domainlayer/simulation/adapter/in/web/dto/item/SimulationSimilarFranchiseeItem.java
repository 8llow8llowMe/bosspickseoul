package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "유사 예산 프랜차이즈 항목 DTO (단위: 만원)")
public record SimulationSimilarFranchiseeItem(

    @Schema(description = "프랜차이즈 아이디", example = "101")
    String franchiseeId,

    @Schema(description = "브랜드 이름", example = "본죽")
    String brandName,

    @Schema(description = "예상 총 창업 비용 (만원)", example = "11800")
    long totalPrice,

    @Schema(description = "가입비 (만원)", example = "1000")
    long subscription,

    @Schema(description = "교육비 (만원)", example = "300")
    long education,

    @Schema(description = "가맹 보증금 (만원)", example = "500")
    long deposit,

    @Schema(description = "기타 비용 (만원)", example = "200")
    long etc,

    @Schema(description = "인테리어 비용 (만원)", example = "4200")
    long interior
) {

}
