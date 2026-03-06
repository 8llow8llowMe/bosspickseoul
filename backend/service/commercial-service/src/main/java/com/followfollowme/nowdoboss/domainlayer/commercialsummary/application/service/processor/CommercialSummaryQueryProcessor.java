package com.followfollowme.nowdoboss.domainlayer.commercialsummary.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.RegionalIncomeSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.RegionalSalesSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.CommercialSummaryRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialSummaryQueryProcessor {

    private final CommercialSummaryRepositoryPort commercialSummaryRepositoryPort;

    public CommercialSalesSummaryInfo getSalesSummary(
        String periodCode,
        String districtCode,
        String administrationCode,
        String commercialCode,
        String serviceCode
    ) {
        RegionalSalesSummaryInfo districtSummary = commercialSummaryRepositoryPort.findSalesDistrict(periodCode, districtCode, serviceCode)
            .map(salesDistrict -> RegionalSalesSummaryInfo.builder()
                .code(salesDistrict.districtCode())
                .name(salesDistrict.districtName())
                .serviceCode(salesDistrict.serviceCode())
                .serviceName(salesDistrict.serviceName())
                .monthlySalesAmount(salesDistrict.monthlySalesAmount())
                .build())
            .orElseThrow(() -> new IllegalArgumentException("자치구 매출 정보를 찾을 수 없습니다."));

        RegionalSalesSummaryInfo administrationSummary = commercialSummaryRepositoryPort.findSalesAdministration(periodCode, administrationCode, serviceCode)
            .map(salesAdministration -> RegionalSalesSummaryInfo.builder()
                .code(salesAdministration.administrationCode())
                .name(salesAdministration.administrationName())
                .serviceCode(salesAdministration.serviceCode())
                .serviceName(salesAdministration.serviceName())
                .monthlySalesAmount(salesAdministration.monthlySalesAmount())
                .build())
            .orElseThrow(() -> new IllegalArgumentException("행정동 매출 정보를 찾을 수 없습니다."));

        RegionalSalesSummaryInfo commercialSummary = commercialSummaryRepositoryPort.findSalesCommercial(periodCode, commercialCode, serviceCode)
            .map(salesCommercial -> RegionalSalesSummaryInfo.builder()
                .code(salesCommercial.commercialCode())
                .name(salesCommercial.commercialName())
                .serviceCode(salesCommercial.serviceCode())
                .serviceName(salesCommercial.serviceName())
                .monthlySalesAmount(salesCommercial.monthlySalesAmount())
                .build())
            .orElseThrow(() -> new IllegalArgumentException("상권 매출 정보를 찾을 수 없습니다."));

        return CommercialSalesSummaryInfo.builder()
            .district(districtSummary)
            .administration(administrationSummary)
            .commercial(commercialSummary)
            .build();
    }

    public CommercialIncomeSummaryInfo getIncomeSummary(
        String periodCode,
        String districtCode,
        String administrationCode,
        String commercialCode
    ) {
        RegionalIncomeSummaryInfo districtSummary = commercialSummaryRepositoryPort.findIncomeDistrict(periodCode, districtCode)
            .map(incomeDistrict -> RegionalIncomeSummaryInfo.builder()
                .code(incomeDistrict.districtCode())
                .name(incomeDistrict.districtName())
                .totalExpenseAmount(incomeDistrict.totalExpenseAmount())
                .build())
            .orElseThrow(() -> new IllegalArgumentException("자치구 지출 정보를 찾을 수 없습니다."));

        RegionalIncomeSummaryInfo administrationSummary = commercialSummaryRepositoryPort.findIncomeAdministration(periodCode, administrationCode)
            .map(incomeAdministration -> RegionalIncomeSummaryInfo.builder()
                .code(incomeAdministration.administrationCode())
                .name(incomeAdministration.administrationName())
                .totalExpenseAmount(incomeAdministration.totalExpenseAmount())
                .build())
            .orElseThrow(() -> new IllegalArgumentException("행정동 지출 정보를 찾을 수 없습니다."));

        RegionalIncomeSummaryInfo commercialSummary = commercialSummaryRepositoryPort.findIncomeCommercial(periodCode, commercialCode)
            .map(incomeCommercial -> RegionalIncomeSummaryInfo.builder()
                .code(incomeCommercial.commercialCode())
                .name(incomeCommercial.commercialName())
                .totalExpenseAmount(incomeCommercial.totalExpenseAmount())
                .build())
            .orElseThrow(() -> new IllegalArgumentException("상권 지출 정보를 찾을 수 없습니다."));

        return CommercialIncomeSummaryInfo.builder()
            .district(districtSummary)
            .administration(administrationSummary)
            .commercial(commercialSummary)
            .build();
    }
}
