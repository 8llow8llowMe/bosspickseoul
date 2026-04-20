package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "성별 유동인구 상세 항목 DTO")
public record DistrictGenderFootTrafficItem(
    @Schema(description = "남성 유동인구", example = "2900000")
    long maleFootTraffic,

    @Schema(description = "여성 유동인구", example = "2947230")
    long femaleFootTraffic,

    @Schema(description = "우세 성별 메타데이터")
    CodeNameDescriptionMetadata dominantGenderType
) {

}
