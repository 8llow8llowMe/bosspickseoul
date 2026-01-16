package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권에 포함된 서비스 업종 코드 및 분류 정보를 나타내는 응답 DTO")
public record CommercialServiceCategoryResponse(

    @Schema(description = "서비스 업종 코드", example = "CS100001")
    String serviceCode,

    @Schema(description = "서비스 업종 코드명", example = "한식음식점")
    String serviceCodeName,

    @Schema(description = "서비스 업종 타입 코드", example = "RESTAURANT")
    String serviceTypeCode,

    @Schema(description = "서비스 업종 타입 설명", example = "음식점")
    String serviceTypeDescription
) {

}
