package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialAgeGenderPercentSalesItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialAgeSalesItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialDaySalesCountItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialDaySalesItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialGenderSalesCountItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialTimeSalesCountItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialTimeSalesItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 매출 정보 응답 DTO")
public record CommercialSalesResponse(

    @Schema(description = "시간대별 매출 정보")
    CommercialTimeSalesItem timeSalesItem,

    @Schema(description = "요일별 매출 정보")
    CommercialDaySalesItem daySalesItem,

    @Schema(description = "연령대별 매출 정보")
    CommercialAgeSalesItem ageSalesItem,

    @Schema(description = "연령대별 및 성별별 매출액 비율 정보")
    CommercialAgeGenderPercentSalesItem ageGenderPercentSalesItem,

    @Schema(description = "요일별 매출건수 정보")
    CommercialDaySalesCountItem daySalesCountItem,

    @Schema(description = "시간대별 매출건수 정보")
    CommercialTimeSalesCountItem timeSalesCountItem,

    @Schema(description = "성별별 매출건수 정보")
    CommercialGenderSalesCountItem genderSalesCountItem
) {

}
