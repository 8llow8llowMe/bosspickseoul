package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SalesByAgeGenderPercentItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SalesByAgeItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SalesCountByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SalesByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SalesCountByGenderItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SalesCountByTimeSlotItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.SalesByTimeSlotItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 매출 정보 조회 응답")
public record SalesResponse(

    @Schema(description = "시간대별 매출액")
    SalesByTimeSlotItem amountByTimeSlotItem,

    @Schema(description = "요일별 매출액")
    SalesByDayOfWeekItem amountByDayOfWeekItem,

    @Schema(description = "연령대별 매출액")
    SalesByAgeItem amountByAgeItem,

    @Schema(description = "연령대 및 성별 매출액 비율")
    SalesByAgeGenderPercentItem amountByAgeGenderPercentItem,

    @Schema(description = "요일별 매출건수")
    SalesCountByDayOfWeekItem countByDayOfWeekItem,

    @Schema(description = "시간대별 매출건수")
    SalesCountByTimeSlotItem countByTimeSlotItem,

    @Schema(description = "성별 매출건수")
    SalesCountByGenderItem countByGenderItem
) {

}