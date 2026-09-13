package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.regional;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialAdministrationQueryResult;

/**
 * district-service 응답 wire DTO 를 out-port 반환 타입인 QueryResult 로 옮긴다.
 *
 * <p>peer 의 응답 필드명을 아는 지점은 wire DTO 뿐이고, application 계층은 QueryResult 만 본다.
 * 컴포넌트 이름·구조가 1:1 로 같고 값 변환이나 분기가 전혀 없는 순수 필드 복사다. 필드를 하나라도 빠뜨리면
 * 조용히 null 이 흘러가므로 {@code RegionAnalysisWireMapperTest} 가 리플렉션으로 모든 말단 필드를 대조한다.
 *
 * <p>{@code RegionAnalysisClient} 의 나머지 3개 메서드는 아직 wire 분리 전이라 여기에 변환이 없다.
 */
public final class RegionAnalysisWireMapper {

    private RegionAnalysisWireMapper() {
    }

    public static CommercialAdministrationQueryResult toQueryResult(CommercialAdministrationClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialAdministrationQueryResult.builder()
            .commercialCode(wire.commercialCode())
            .commercialName(wire.commercialName())
            .districtCode(wire.districtCode())
            .districtName(wire.districtName())
            .administrationCode(wire.administrationCode())
            .administrationName(wire.administrationName())
            .build();
    }
}
