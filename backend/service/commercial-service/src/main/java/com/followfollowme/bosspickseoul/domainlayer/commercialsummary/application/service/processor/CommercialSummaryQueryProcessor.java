package com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.RegionalIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.RegionalSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialSummaryRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor.CommercialExpenseProvenanceProcessor;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.exception.CommercialSummaryErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.exception.CommercialSummaryException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialSummaryQueryProcessor {

    private final CommercialSummaryRepositoryPort commercialSummaryRepositoryPort;
    private final CommercialExpenseProvenanceProcessor commercialExpenseProvenanceProcessor;

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
     *
     * <p>상권 leg 는 {@code /income} 과 <b>같은 해상도 사다리</b>를 탄다 — 네이티브 지출이 없으면 소속 행정동
     * 총액으로 대체하고, 그것도 없으면 null 이다. 대체하는 것은 <b>총액뿐</b>이고 자치구·행정동 leg 는 원천이
     * 살아 있으므로 건드리지 않는다. (이슈 #415)
     *
     * <p>행정동 소비 행은 <b>행정동 leg 를 채우면서 이미 읽은 것을 재사용</b>한다. 대체 판정을 위해 다시
     * 조회하면 요약 한 번에 같은 행을 두 번 읽는다. 사다리 판정 자체는
     * {@link CommercialExpenseProvenanceProcessor#resolve} 한 곳에만 있어 {@code /income} 과 갈리지 않는다.
     *
     * <p>상권 leg 의 {@code code}·{@code name} 은 대체를 쓰더라도 <b>상권의 것</b>을 유지한다. 행정동 코드로
     * 바꿔 버리면 자치구·행정동·상권 세 줄을 나란히 그리는 화면에서 같은 행정동이 두 번 나온다. 값을 실제로
     * 어디서 가져왔는지는 {@code commercialProvenance} 가 알려 준다.
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

        IncomeAdministration administrationRow = commercialSummaryRepositoryPort
            .findIncomeAdministration(periodCode, administrationCode)
            .orElse(null);
        RegionalIncomeSummaryInfo administrationSummary = administrationRow == null ? null
            : RegionalIncomeSummaryInfo.builder()
                .code(administrationRow.administrationCode())
                .name(administrationRow.administrationName())
                .totalExpenseAmount(administrationRow.totalExpenseAmount())
                .build();

        IncomeCommercial commercialRow = commercialSummaryRepositoryPort.findIncomeCommercial(periodCode, commercialCode)
            .orElse(null);
        CommercialIncomeAndExpenseInfo resolvedExpense = commercialExpenseProvenanceProcessor
            .resolve(periodCode, administrationRow, commercialRow);

        RegionalIncomeSummaryInfo commercialSummary = resolvedExpense.hasValue()
            ? RegionalIncomeSummaryInfo.builder()
                .code(commercialCode)
                .name(commercialRow == null ? null : commercialRow.commercialName())
                .totalExpenseAmount(resolvedExpense.expenseCategorySum())
                .build()
            : null;

        return CommercialIncomeSummaryInfo.builder()
            .district(districtSummary)
            .administration(administrationSummary)
            .commercial(commercialSummary)
            .commercialProvenance(resolvedExpense.provenance())
            .build();
    }
}
