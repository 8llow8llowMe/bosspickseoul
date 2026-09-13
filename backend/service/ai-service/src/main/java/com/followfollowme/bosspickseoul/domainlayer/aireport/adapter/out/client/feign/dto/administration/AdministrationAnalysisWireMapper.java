package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.administration;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationCommercialQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationDistrictQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationIncomeDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationSalesDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationSalesServiceTopQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationStoreDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationStoreServiceTopQueryResult;
import java.util.List;
import java.util.function.Function;

/**
 * Administration 계열 응답 wire DTO 를 out-port 반환 타입인 QueryResult 로 옮긴다.
 *
 * <p>peer 의 응답 필드명을 아는 지점은 wire DTO 뿐이고, application 계층은 QueryResult 만 본다.
 * 8종 전부 컴포넌트 이름·구조가 1:1 로 같고 값 변환이나 분기가 전혀 없는 순수 필드 복사다. 파생 필드는 없다.
 * 필드를 하나라도 빠뜨리면 primitive 기본값 {@code 0} 이 조용히 흘러가므로,
 * {@code AdministrationAnalysisWireMapperTest} 가 리플렉션으로 모든 말단 필드가 옮겨졌는지 검사한다.
 *
 * <p>peer 가 둘이다. 행정동 상세는 commercial-service 에서, 상위 지역과 소속 상권 목록은 district-service
 * 에서 온다. 변환 규칙이 같아 한 매퍼에 둔다.
 *
 * <p>중첩 컴포넌트와 목록은 peer 가 생략할 수 있어 null 을 그대로 통과시킨다(기존 역직렬화 동작과 같다).
 * 빈 목록과 null 목록은 의미가 다르므로 빈 목록으로 바꾸지 않는다.
 */
public final class AdministrationAnalysisWireMapper {

    private AdministrationAnalysisWireMapper() {
    }

    public static AdministrationDetailQueryResult toQueryResult(AdministrationDetailClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return AdministrationDetailQueryResult.builder()
            .administrationCode(wire.administrationCode())
            .administrationName(wire.administrationName())
            .sales(toQueryResult(wire.sales()))
            .store(toQueryResult(wire.store()))
            .income(toQueryResult(wire.income()))
            .build();
    }

    public static AdministrationDistrictQueryResult toQueryResult(AdministrationDistrictClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return AdministrationDistrictQueryResult.builder()
            .districtCode(wire.districtCode())
            .districtName(wire.districtName())
            .administrationCode(wire.administrationCode())
            .administrationName(wire.administrationName())
            .build();
    }

    public static List<AdministrationCommercialQueryResult> toCommercialQueryResults(
        List<AdministrationCommercialClientResponse> wires
    ) {
        return mapEach(wires, AdministrationAnalysisWireMapper::toQueryResult);
    }

    public static AdministrationCommercialQueryResult toQueryResult(AdministrationCommercialClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return AdministrationCommercialQueryResult.builder()
            .commercialCode(wire.commercialCode())
            .commercialName(wire.commercialName())
            .build();
    }

    private static AdministrationSalesDetailQueryResult toQueryResult(AdministrationSalesDetailClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return AdministrationSalesDetailQueryResult.builder()
            .topSalesServices(mapEach(wire.topSalesServices(), AdministrationAnalysisWireMapper::toQueryResult))
            .build();
    }

    private static AdministrationStoreDetailQueryResult toQueryResult(AdministrationStoreDetailClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return AdministrationStoreDetailQueryResult.builder()
            .topStoreServices(mapEach(wire.topStoreServices(), AdministrationAnalysisWireMapper::toQueryResult))
            .build();
    }

    private static AdministrationIncomeDetailQueryResult toQueryResult(AdministrationIncomeDetailClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return AdministrationIncomeDetailQueryResult.builder()
            .totalExpenseAmount(wire.totalExpenseAmount())
            .build();
    }

    /**
     * 목록을 항목 단위로 옮긴다. 상위 업종·상권 목록은 순위가 곧 의미라 peer 가 준 순서를 그대로 유지한다.
     * 목록 자체가 null 이면 null 을 그대로 통과시킨다. 빈 목록("상위 업종이 없다")과 의미가 다르기 때문이다.
     */
    private static <W, Q> List<Q> mapEach(List<W> wires, Function<W, Q> mapping) {
        if (wires == null) {
            return null;
        }
        return wires.stream()
            .map(mapping)
            .toList();
    }

    private static AdministrationSalesServiceTopQueryResult toQueryResult(AdministrationSalesServiceTopClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return AdministrationSalesServiceTopQueryResult.builder()
            .serviceCode(wire.serviceCode())
            .serviceName(wire.serviceName())
            .monthlySalesAmount(wire.monthlySalesAmount())
            .salesChangeRate(wire.salesChangeRate())
            .build();
    }

    private static AdministrationStoreServiceTopQueryResult toQueryResult(AdministrationStoreServiceTopClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return AdministrationStoreServiceTopQueryResult.builder()
            .serviceCode(wire.serviceCode())
            .serviceName(wire.serviceName())
            .totalStoreCount(wire.totalStoreCount())
            .similarStoreCount(wire.similarStoreCount())
            .openedStoreCount(wire.openedStoreCount())
            .closedStoreCount(wire.closedStoreCount())
            .franchiseStoreCount(wire.franchiseStoreCount())
            .openingRate(wire.openingRate())
            .closureRate(wire.closureRate())
            .build();
    }
}
