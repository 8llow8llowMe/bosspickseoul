package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictAgeGroupFootTrafficItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictDayOfWeekFootTrafficItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictGenderFootTrafficItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictPeriodFootTrafficItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictTimeSlotFootTrafficItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "자치구 유동인구 상세 응답 DTO")
public record FootTrafficDistrictDetailResponse(

    @Schema(description = "직전 분기 대비 추이 메타데이터 (PeriodTrendType: INCREASE/DECREASE/STAGNANT)",
        example = "{\"code\": \"INCREASE\", \"name\": \"증가\", \"description\": \"증가\"}")
    CodeNameDescriptionMetadata periodTrend,

    @Schema(description = "분기별 총 유동인구 목록")
    List<DistrictPeriodFootTrafficItem> periodTotalFootTrafficList,

    @Schema(description = "시간대별 유동인구 상세")
    DistrictTimeSlotFootTrafficItem timeSlot,

    @Schema(description = "성별 유동인구 상세")
    DistrictGenderFootTrafficItem gender,

    @Schema(description = "연령대별 유동인구 상세")
    DistrictAgeGroupFootTrafficItem ageGroup,

    @Schema(description = "요일별 유동인구 상세")
    DistrictDayOfWeekFootTrafficItem dayOfWeek
) {

}
