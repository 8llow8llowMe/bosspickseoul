package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialBenchmarkInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.service.processor.CommercialSummaryQueryProcessor;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialBenchmarkQueryProcessor {

    private final CommercialQueryProcessor commercialQueryProcessor;
    private final CommercialSummaryQueryProcessor commercialSummaryQueryProcessor;
    private final CommercialRegionQueryPort commercialRegionQueryPort;

    public CommercialBenchmarkInfo getBenchmarks(String periodCode, String commercialCode, String serviceCode) {
        CommercialAdministrationQueryResult region = commercialRegionQueryPort.getCommercialAdministration(commercialCode);
        CommercialSalesSummaryInfo salesSummary = commercialSummaryQueryProcessor.getSalesSummary(
            periodCode,
            region.districtCode(),
            region.administrationCode(),
            commercialCode,
            serviceCode
        );
        CommercialIncomeSummaryInfo incomeSummary = commercialSummaryQueryProcessor.getIncomeSummary(
            periodCode,
            region.districtCode(),
            region.administrationCode(),
            commercialCode
        );
        String commercialName = commercialQueryProcessor
            .getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode)
            .commercialName();

        return CommercialBenchmarkInfo.builder()
            .commercialCode(commercialCode)
            .commercialName(commercialName)
            .districtCode(region.districtCode())
            .districtName(region.districtName())
            .administrationCode(region.administrationCode())
            .administrationName(region.administrationName())
            .summary(
            "%s의 매출과 소비력 지표를 자치구 및 행정동 평균과 비교한 결과입니다.".formatted(commercialName))
            .salesSummary(salesSummary)
            .incomeSummary(incomeSummary)
            .benchmarkHighlights(buildHighlights(commercialName))
            .build();
    }

    private List<String> buildHighlights(String commercialName) {
        return List.of(
            "%s의 매출 수준을 자치구 평균과 비교할 수 있습니다.".formatted(commercialName),
            "%s의 매출 수준을 행정동 평균과 비교할 수 있습니다.".formatted(commercialName),
            "%s의 소비력 수준을 지역 평균과 함께 확인할 수 있습니다.".formatted(commercialName)
        );
    }
}
