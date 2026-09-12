package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 지도 뷰포트 한 번의 조회가 읽어 올 수 있는 영역 행 수 상한.
 *
 * <p>서울 전량은 자치구 25 · 행정동 424 · 상권 1650 행이다. 상한이 없으면 넓은 줌에서 폴리곤 JSON 을
 * 전량 읽어 파싱하게 된다. 상권 상한이 가장 빡빡한 이유는 조회 결과가 그대로 commercial-service
 * Feign GET 의 쿼리 파라미터가 되기 때문이다. 코드 1건당 약 24B 이고 수신 측 Tomcat 기본
 * max-http-request-header-size 는 8192B 라, 약 341건에서 요청 라인이 한도를 넘는다. 250건이면
 * 약 6KB 로 여유가 남는다.
 *
 * <p>AreaType 별 상한 선택은 여기가 아니라 MapQueryProcessor 가 한다. global 이 domainlayer 를
 * 역참조하지 않게 하기 위해서다.
 */
@ConfigurationProperties(prefix = "app.map.viewport")
public record MapViewportProperties(int maxDistrictAreas, int maxAdministrationAreas, int maxCommercialAreas) {

    private static final int DEFAULT_MAX_DISTRICT_AREAS = 50;
    private static final int DEFAULT_MAX_ADMINISTRATION_AREAS = 500;
    private static final int DEFAULT_MAX_COMMERCIAL_AREAS = 250;

    public MapViewportProperties {
        if (maxDistrictAreas <= 0) {
            maxDistrictAreas = DEFAULT_MAX_DISTRICT_AREAS;
        }
        if (maxAdministrationAreas <= 0) {
            maxAdministrationAreas = DEFAULT_MAX_ADMINISTRATION_AREAS;
        }
        if (maxCommercialAreas <= 0) {
            maxCommercialAreas = DEFAULT_MAX_COMMERCIAL_AREAS;
        }
    }
}
