package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesByAgeGenderPercentItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesByAgeItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesCountByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesCountByGenderItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesCountByTimeSlotItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSalesByTimeSlotItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 매출 정보 조회 응답")
public record CommercialSalesResponse(

    @Schema(description = "시간대별 매출액")
    CommercialSalesByTimeSlotItem amountByTimeSlotItem,

    @Schema(description = "요일별 매출액")
    CommercialSalesByDayOfWeekItem amountByDayOfWeekItem,

    @Schema(description = "연령대별 매출액")
    CommercialSalesByAgeItem amountByAgeItem,

    @Schema(description = "연령대 및 성별 매출액 비율")
    CommercialSalesByAgeGenderPercentItem amountByAgeGenderPercentItem,

    @Schema(description = "요일별 매출건수")
    CommercialSalesCountByDayOfWeekItem countByDayOfWeekItem,

    @Schema(description = "시간대별 매출건수")
    CommercialSalesCountByTimeSlotItem countByTimeSlotItem,

    @Schema(description = "성별 매출건수")
    CommercialSalesCountByGenderItem countByGenderItem
) {

}
