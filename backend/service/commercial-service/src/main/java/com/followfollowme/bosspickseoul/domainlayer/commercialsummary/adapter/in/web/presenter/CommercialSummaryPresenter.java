package com.followfollowme.bosspickseoul.domainlayer.commercialsummary.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.RegionalIncomeSummaryItem;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.RegionalSalesSummaryItem;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeSummaryResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesSummaryResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.RegionalIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.RegionalSalesSummaryInfo;
import org.springframework.stereotype.Component;

@Component
public class CommercialSummaryPresenter {

    public CommercialSalesSummaryResponse toCommercialSalesSummaryResponse(CommercialSalesSummaryInfo info) {
        return CommercialSalesSummaryResponse.builder()
            .district(toRegionalSalesSummaryItem(info.district()))
            .administration(toRegionalSalesSummaryItem(info.administration()))
            .commercial(toRegionalSalesSummaryItem(info.commercial()))
            .build();
    }

    public CommercialIncomeSummaryResponse toCommercialIncomeSummaryResponse(CommercialIncomeSummaryInfo info) {
        return CommercialIncomeSummaryResponse.builder()
            .district(toRegionalIncomeSummaryItem(info.district()))
            .administration(toRegionalIncomeSummaryItem(info.administration()))
            .commercial(toRegionalIncomeSummaryItem(info.commercial()))
            .build();
    }

    private RegionalSalesSummaryItem toRegionalSalesSummaryItem(RegionalSalesSummaryInfo info) {
        return RegionalSalesSummaryItem.builder()
            .code(info.code())
            .name(info.name())
            .serviceCode(info.serviceCode())
            .serviceName(info.serviceName())
            .monthlySalesAmount(info.monthlySalesAmount())
            .build();
    }

    private RegionalIncomeSummaryItem toRegionalIncomeSummaryItem(RegionalIncomeSummaryInfo info) {
        return RegionalIncomeSummaryItem.builder()
            .code(info.code())
            .name(info.name())
            .totalExpenseAmount(info.totalExpenseAmount())
            .build();
    }
}
