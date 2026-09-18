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
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommercialSummaryQueryProcessor {

    private final CommercialSummaryRepositoryPort commercialSummaryRepositoryPort;
    private final CommercialExpenseProvenanceProcessor commercialExpenseProvenanceProcessor;

    /**
     * 매출 요약은 세 지역 단위를 모두 DB 에서만 읽는다. 외부 호출이 섞이지 않으므로 세 조회를 한 트랜잭션으로
     * 묶어도 커넥션을 원격 응답 대기에 쓰지 않는다. (architecture-guide §3)
     */
    @Transactional(readOnly = true)
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
     * <p><b>대체 원천이 되는 행정동은 요청 파라미터가 아니라 서버가 상권 코드로 해석한 것</b>이다. 판정은
     * {@link CommercialExpenseProvenanceProcessor#resolve} 안에만 있다. 요청이 지목한 행정동을 그대로 믿으면
     * 그 상권이 속하지 않은 동 코드가 왔을 때 무관한 동의 총액이 상권 값으로 들어가고, 면책 문장이 틀린 동
     * 이름을 단정한다. 이미 읽은 행정동 행은 해석 결과와 코드가 같을 때만 재사용되므로, 정상 요청에서는 같은
     * 행을 두 번 읽지 않는다.
     *
     * <p>행정동 leg 의 총액도 <b>세부 항목합</b>이다({@link IncomeAdministration#displayTotalExpenseAmount()}).
     * 대체 구간에서 상권 leg 가 같은 행의 항목합을 쓰므로, 행정동 leg 만 합계 컬럼을 쓰면 "이 둘은 같은 값"
     * 이라고 설명하는 두 줄에 다른 숫자가 그려진다.
     *
     * <p>상권 leg 의 {@code code}·{@code name} 은 대체를 쓰더라도 <b>상권의 것</b>을 유지한다. 행정동 코드로
     * 바꿔 버리면 자치구·행정동·상권 세 줄을 나란히 그리는 화면에서 같은 행정동이 두 번 나온다. 값을 실제로
     * 어디서 가져왔는지는 {@code commercialProvenance} 가 알려 준다. 상권 소비 행 자체가 없는 대체 구간에서는
     * 이름을 가져올 곳이 없어 {@code name} 이 null 이다 — 소비 요약 응답 어디에도 상권명이 없기 때문이다.
     *
     * <p>트랜잭션을 걸지 않는다. 사다리 2단계가 지역 서비스를 Feign 으로 부르므로 여기에 경계를 두면 원격
     * 응답을 기다리는 동안 DB 커넥션을 쥔다. (architecture-guide §3)
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
                .totalExpenseAmount(administrationRow.displayTotalExpenseAmount())
                .build();

        IncomeCommercial commercialRow = commercialSummaryRepositoryPort.findIncomeCommercial(periodCode, commercialCode)
            .orElse(null);
        CommercialIncomeAndExpenseInfo resolvedExpense = commercialExpenseProvenanceProcessor
            .resolve(periodCode, commercialCode, commercialRow, administrationRow);

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
