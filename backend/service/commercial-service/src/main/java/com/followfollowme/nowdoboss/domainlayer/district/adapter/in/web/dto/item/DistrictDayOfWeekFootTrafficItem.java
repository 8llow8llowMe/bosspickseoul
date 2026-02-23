package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item;

import com.followfollowme.nowdoboss.domainlayer.district.domain.enums.DistrictDayOfWeekType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "요일별 유동인구 상세")
public record DistrictDayOfWeekFootTrafficItem(
    @Schema(description = "월요일 유동인구", example = "780000")
    long mondayFootTraffic,

    @Schema(description = "화요일 유동인구", example = "790000")
    long tuesdayFootTraffic,

    @Schema(description = "수요일 유동인구", example = "800000")
    long wednesdayFootTraffic,

    @Schema(description = "목요일 유동인구", example = "810000")
    long thursdayFootTraffic,

    @Schema(description = "금요일 유동인구", example = "900000")
    long fridayFootTraffic,

    @Schema(description = "토요일 유동인구", example = "1020000")
    long saturdayFootTraffic,

    @Schema(description = "일요일 유동인구", example = "747230")
    long sundayFootTraffic,

    @Schema(description = "유동인구가 가장 높은 요일", example = "SATURDAY")
    DistrictDayOfWeekType dominantDayOfWeekType
) {

}
