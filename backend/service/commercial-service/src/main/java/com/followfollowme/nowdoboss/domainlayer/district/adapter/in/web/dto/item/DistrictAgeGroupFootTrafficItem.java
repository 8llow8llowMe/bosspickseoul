package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item;

import com.followfollowme.nowdoboss.domainlayer.district.domain.enums.DistrictAgeGroupType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "연령대별 유동인구 상세")
public record DistrictAgeGroupFootTrafficItem(
    @Schema(description = "10대 유동인구", example = "340000")
    long age10FootTraffic,

    @Schema(description = "20대 유동인구", example = "980000")
    long age20FootTraffic,

    @Schema(description = "30대 유동인구", example = "1240000")
    long age30FootTraffic,

    @Schema(description = "40대 유동인구", example = "1020000")
    long age40FootTraffic,

    @Schema(description = "50대 유동인구", example = "820000")
    long age50FootTraffic,

    @Schema(description = "60대 이상 유동인구", example = "447230")
    long age60PlusFootTraffic,

    @Schema(description = "유동인구가 가장 높은 연령대", example = "AGE_30")
    DistrictAgeGroupType dominantAgeGroupType
) {

}
