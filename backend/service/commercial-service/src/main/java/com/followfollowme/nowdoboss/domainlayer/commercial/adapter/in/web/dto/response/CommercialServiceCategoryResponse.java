package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권 서비스 업종 정보 조회 응답 DTO")
public record CommercialServiceCategoryResponse(

    @Schema(description = "서비스 업종 코드", example = "CS100001")
    String serviceCode,

    @Schema(description = "서비스 업종명", example = "한식음식점")
    String serviceName,

    @Schema(description = "서비스 업종 유형 메타데이터")
    CodeNameDescriptionMetadata serviceType
) {

}
