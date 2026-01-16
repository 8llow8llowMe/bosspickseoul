package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권 내의 학교 수 정보 DTO")
public record CommercialSchoolCountItem(

    @Schema(description = "초등학교 수", example = "1")
    long elementarySchoolCount,

    @Schema(description = "중학교 수", example = "1")
    long middleSchoolCount,

    @Schema(description = "고등학교 수", example = "1")
    long highSchoolCount,

    @Schema(description = "대학교 수", example = "1")
    long universityCount,

    @Schema(description = "총 학교 수 (초등 + 중등 + 고등 + 대학)", example = "4")
    long totalSchoolCount
) {

}
