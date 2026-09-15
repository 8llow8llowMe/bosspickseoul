package com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.exception.CommercialSummaryErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.exception.CommercialSummaryException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.RegionalIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.RegionalSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialSummaryRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialSummaryQueryProcessor {

    private final CommercialSummaryRepositoryPort commercialSummaryRepositoryPort;

    public CommercialSalesSummaryInfo getSalesSummary(

        String periodCode, String districtCode, String administrationCode, String commercialCode, String serviceCode
    ) {
        RegionalSalesSummaryInfo districtSummary = commercialSummaryRepositoryPort.findSalesDistrict(periodCode, districtCode, serviceCode)
            .map(salesDistrict -> RegionalSalesSummaryInfo.builder()
                .code(salesDistrict.districtCode())
                .name(salesDistrict.districtName())
                .serviceCode(salesDistrict.serviceCode())
                .serviceName(salesDistrict.serviceName())
                .monthlySalesAmount(salesDistrict.monthlySalesAmount())
                .build())
            .orElseThrow(() -> new CommercialSummaryException(CommercialSummaryErrorCode.SALES_NOT_FOUND, "자치구"));

        RegionalSalesSummaryInfo administrationSummary = commercialSummaryRepositoryPort
            .findSalesAdministration(periodCode, administrationCode, serviceCode)
            .map(salesAdministration -> RegionalSalesSummaryInfo.builder()
                .code(salesAdministration.administrationCode())
                .name(salesAdministration.administrationName())
                .serviceCode(salesAdministration.serviceCode())
                .serviceName(salesAdministration.serviceName())
                .monthlySalesAmount(salesAdministration.monthlySalesAmount())
                .build())
            .orElseThrow(() -> new CommercialSummaryException(CommercialSummaryErrorCode.SALES_NOT_FOUND, "행정동"));

        RegionalSalesSummaryInfo commercialSummary = commercialSummaryRepositoryPort
            .findSalesCommercial(periodCode, commercialCode, serviceCode)
            .map(salesCommercial -> RegionalSalesSummaryInfo.builder()
                .code(salesCommercial.commercialCode())
                .name(salesCommercial.commercialName())
                .serviceCode(salesCommercial.serviceCode())
                .serviceName(salesCommercial.serviceName())
                .monthlySalesAmount(salesCommercial.monthlySalesAmount())
                .build())
            .orElseThrow(() -> new CommercialSummaryException(CommercialSummaryErrorCode.SALES_NOT_FOUND, "상권"));

        return CommercialSalesSummaryInfo.builder()
            .district(districtSummary)
            .administration(administrationSummary)
            .commercial(commercialSummary)
            .build();
    }

    /**
     * 2024년 이후 상권의 3분의 1 은 소득소비 행 자체가 없다. 예전에는 셋 중 하나만 없어도 요약 API 전체가
     * 404 로 실패했으므로, 없는 지역 단위만 null 로 강등하고 나머지는 그대로 응답한다. (이슈 #413)
     */
    public CommercialIncomeSummaryInfo getIncomeSummary(

        String periodCode, String districtCode, String administrationCode, String commercialCode
    ) {
        RegionalIncomeSummaryInfo districtSummary = commercialSummaryRepositoryPort.findIncomeDistrict(periodCode, districtCode)
            .map(incomeDistrict -> RegionalIncomeSummaryInfo.builder()
                .code(incomeDistrict.districtCode())
                .name(incomeDistrict.districtName())
                .totalExpenseAmount(incomeDistrict.totalExpenseAmount())
                .build())
            .orElse(null);

        RegionalIncomeSummaryInfo administrationSummary = commercialSummaryRepositoryPort
            .findIncomeAdministration(periodCode, administrationCode)
            .map(incomeAdministration -> RegionalIncomeSummaryInfo.builder()
                .code(incomeAdministration.administrationCode())
                .name(incomeAdministration.administrationName())
                .totalExpenseAmount(incomeAdministration.totalExpenseAmount())
                .build())
            .orElse(null);

        RegionalIncomeSummaryInfo commercialSummary = commercialSummaryRepositoryPort.findIncomeCommercial(periodCode, commercialCode)
            .map(incomeCommercial -> RegionalIncomeSummaryInfo.builder()
                .code(incomeCommercial.commercialCode())
                .name(incomeCommercial.commercialName())
                .totalExpenseAmount(incomeCommercial.totalExpenseAmount())
                .build())
            .orElse(null);

        return CommercialIncomeSummaryInfo.builder()
            .district(districtSummary)
            .administration(administrationSummary)
            .commercial(commercialSummary)
            .build();
    }
}
