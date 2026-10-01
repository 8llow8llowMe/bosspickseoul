package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialDistrictAverageIncomeInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * {@code GET /commercials/{code}/income} 조립. 소비(해상도 사다리)와 자치구 평균 소득(대체)을 함께 만든다. (이슈 #415)
 *
 * <p>두 판정 모두 상권 -> 지역 해석이 필요하다. 각자 부르면 같은 상권에 지역 서비스 Feign 이 두 번 붙으므로 여기서
 * {@link CommercialRegionLookup} 하나를 만들어 둘에 넘긴다. 요청 하나에 Feign 은 많아야 한 번이다. 소비가 상권 네이티브인
 * 분기에서도 소득 대체가 자치구를 알아야 하므로 한 번은 부른다.
 *
 * <p>상권 매핑이 없으면(404) 두 지표 모두 「제공 없음」으로 흡수하고, 503·400 은 전파한다. 지역 서비스 장애를 「데이터 없음」으로
 * 뭉개면 장애가 정상 응답으로 보인다.
 *
 * <p>트랜잭션을 걸지 않는다. 사유는 {@code CommercialWebFacade} javadoc.
 */
@Service
@RequiredArgsConstructor
public class CommercialIncomeQueryProcessor {

    private final CommercialRegionQueryPort commercialRegionQueryPort;
    private final CommercialExpenseProvenanceProcessor commercialExpenseProvenanceProcessor;
    private final CommercialDistrictIncomeProcessor commercialDistrictIncomeProcessor;

    public CommercialIncomeAndExpenseResponseInfo getIncome(String periodCode, String commercialCode) {
        CommercialRegionLookup regionLookup = CommercialRegionLookup.of(commercialRegionQueryPort, commercialCode);

        CommercialIncomeAndExpenseInfo expense = commercialExpenseProvenanceProcessor
            .getExpenseByPeriodCodeAndCommercialCode(periodCode, commercialCode, regionLookup);
        CommercialDistrictAverageIncomeInfo districtAverageIncome = commercialDistrictIncomeProcessor.resolve(periodCode, regionLookup);

        return CommercialIncomeAndExpenseResponseInfo.builder()
            .expense(expense)
            .districtAverageIncome(districtAverageIncome)
            .build();
    }
}
