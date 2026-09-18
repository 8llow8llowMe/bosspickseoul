package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.CommercialAnalysisClient;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialAnalysisWireMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.CommercialAnalysisQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialComparisonQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFacilityQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFootTrafficQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeAndExpenseQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeSummaryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialResidentPopulationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesSummaryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialStoreAnalysisQueryResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommercialAnalysisClientAdapter implements CommercialAnalysisQueryPort {

    private final CommercialAnalysisClient commercialAnalysisClient;
    private final InternalResponseSupport responseSupport;

    /*
     * 아래 8개는 peer 응답을 wire DTO(adapter/out/client/feign/dto/commercial)로 받아 QueryResult 로 옮긴다.
     * peer 의 응답 필드명을 아는 지점은 wire DTO 뿐이고, out-port 계약은 QueryResult 로만 표현된다.
     * getCommercialComparison 만 아직 wire 분리 전이라 QueryResult 를 Feign 반환 타입으로 그대로 쓴다
     * (이슈 #380 / #387 범위 밖).
     */

    @Override
    public CommercialFootTrafficQueryResult getCommercialFootTraffic(String commercialCode, String periodCode) {
        return CommercialAnalysisWireMapper.toQueryResult(responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialAnalysisClient.getCommercialFootTraffic(commercialCode, periodCode)
        ));
    }

    @Override
    public CommercialSalesQueryResult getCommercialSales(String commercialCode, String serviceCode, String periodCode) {
        return CommercialAnalysisWireMapper.toQueryResult(responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialAnalysisClient.getCommercialSales(commercialCode, serviceCode, periodCode)
        ));
    }

    @Override
    public CommercialFacilityQueryResult getCommercialFacility(String commercialCode, String periodCode) {
        return CommercialAnalysisWireMapper.toQueryResult(responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialAnalysisClient.getCommercialFacility(commercialCode, periodCode)
        ));
    }

    @Override
    public CommercialResidentPopulationQueryResult getCommercialPopulation(String commercialCode, String periodCode) {
        return CommercialAnalysisWireMapper.toQueryResult(responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialAnalysisClient.getCommercialPopulation(commercialCode, periodCode)
        ));
    }

    /**
     * 소득소비만 404 를 결측(null)으로 흡수한다.
     *
     * <p>이 흡수는 이제 거의 타지 않는다. peer 가 소비 해상도 사다리(상권 네이티브 → 행정동 대체 → 제공 없음)를
     * 넣으면서, 소비 행이 없던 560개 상권도 404 가 아니라 200 과 {@code scope=UNAVAILABLE} 을 받는다(이슈 #415).
     * 그래도 분기를 남겨 둔다 — peer 가 다른 이유로 404 를 줄 수 있고, 지표 하나 때문에 리포트 생성이 통째로
     * 실패하는 것보다 결측으로 계속 가는 편이 낫다. 프롬프트 조립은 지출과 출처가 모두 null 인 경우를 결측
     * 표기로 처리한다. 5xx·타임아웃·서킷 열림은 계속 전파된다. (이슈 #413)
     */
    @Override
    public CommercialIncomeAndExpenseQueryResult getCommercialIncome(String commercialCode, String periodCode) {
        return CommercialAnalysisWireMapper.toQueryResult(responseSupport.requestAndUnwrapOrNullWhenNotFound(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialAnalysisClient.getCommercialIncome(commercialCode, periodCode)
        ));
    }

    @Override
    public CommercialStoreAnalysisQueryResult getCommercialStore(String commercialCode, String serviceCode, String periodCode) {
        return CommercialAnalysisWireMapper.toQueryResult(responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialAnalysisClient.getCommercialStore(commercialCode, serviceCode, periodCode)
        ));
    }

    @Override
    public CommercialSalesSummaryQueryResult getCommercialSalesSummary(
        String districtCode, String administrationCode, String commercialCode, String serviceCode, String periodCode
    ) {
        return CommercialAnalysisWireMapper.toQueryResult(responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialAnalysisClient.getCommercialSalesSummary(
                commercialCode, districtCode, administrationCode, serviceCode, periodCode
            )
        ));
    }

    @Override
    public CommercialIncomeSummaryQueryResult getCommercialIncomeSummary(
        String districtCode, String administrationCode, String commercialCode, String periodCode
    ) {
        return CommercialAnalysisWireMapper.toQueryResult(responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialAnalysisClient.getCommercialIncomeSummary(commercialCode, districtCode, administrationCode, periodCode)
        ));
    }

    @Override
    public CommercialComparisonQueryResult getCommercialComparison(
        String leftCommercialCode, String rightCommercialCode, String serviceCode, String periodCode
    ) {
        return responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialAnalysisClient.getCommercialComparison(leftCommercialCode, rightCommercialCode, serviceCode, periodCode)
        );
    }
}
