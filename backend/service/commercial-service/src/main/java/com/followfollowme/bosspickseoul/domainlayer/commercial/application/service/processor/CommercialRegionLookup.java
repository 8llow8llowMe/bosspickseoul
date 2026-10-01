package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;

/**
 * 한 요청 안에서 상권 -> 자치구·행정동 해석을 <b>한 번만</b> 하는 조회 메모. (이슈 #415)
 *
 * <p>{@code /income} 은 소비 대체(소속 행정동)와 소득 대체(소속 자치구)가 같은 지역 서비스 응답을 쓴다. 두 판정이 각자
 * {@link CommercialRegionQueryPort} 를 부르면 같은 상권에 Feign 왕복이 두 번 붙으므로, 유스케이스가 이 객체 하나를 만들어 두
 * 판정에 넘긴다.
 *
 * <p>첫 {@link #administration()} 에서만 포트를 부른다(지연). 소비가 상권 네이티브라 행정동이 필요 없는 분기에서 소비 판정이
 * 지역 서비스를 건드리지 않게 하려는 것이다. 매핑이 없는 상권(404)은 {@code null} 로 기억해 두 번째 판정도 다시 부르지 않는다.
 * 503·400 은 {@link CommercialQuietFetchSupport} 판정대로 전파하고 기억하지 않는다 — 요청이 거기서 끝난다.
 *
 * <p>요청 하나에 묶인 상태 객체라 빈이 아니고 스레드 사이에 나눠 쓰지 않는다.
 */
final class CommercialRegionLookup {

    private final CommercialRegionQueryPort commercialRegionQueryPort;
    private final String commercialCode;

    private boolean fetched;
    private CommercialAdministrationQueryResult administration;

    private CommercialRegionLookup(CommercialRegionQueryPort commercialRegionQueryPort, String commercialCode) {
        this.commercialRegionQueryPort = commercialRegionQueryPort;
        this.commercialCode = commercialCode;
    }

    static CommercialRegionLookup of(CommercialRegionQueryPort commercialRegionQueryPort, String commercialCode) {
        return new CommercialRegionLookup(commercialRegionQueryPort, commercialCode);
    }

    /**
     * 상권이 속한 자치구·행정동. 매핑이 없는 상권(404)이면 {@code null} 이다. 매핑이 있어도 개별 코드는 비어 있을 수 있으므로
     * 호출부가 쓰는 코드를 따로 확인한다.
     */
    CommercialAdministrationQueryResult administration() {
        if (!fetched) {
            administration = CommercialQuietFetchSupport.fetchOrNullWhenNotFound(
                () -> commercialRegionQueryPort.getCommercialAdministration(commercialCode));
            fetched = true;
        }
        return administration;
    }
}
