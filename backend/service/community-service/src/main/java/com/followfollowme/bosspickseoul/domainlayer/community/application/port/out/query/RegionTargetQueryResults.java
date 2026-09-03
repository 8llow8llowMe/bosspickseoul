package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query;

/**
 * district-service 지역 조회 응답 계약. 커뮤니티가 필요로 하는 필드만 정의하며,
 * 필드명은 district-service 의 region 응답 DTO 와 일치해야 한다 (Feign 역직렬화 계약).
 */
public final class RegionTargetQueryResults {

    /** GET /api/v1/regions/districts/{districtCode} */
    public record DistrictAreaQueryResult(String districtCode, String districtName) {
    }

    /** GET /api/v1/regions/administrations/{administrationCode} */
    public record AdministrationAreaQueryResult(
        String districtCode, String districtName,
        String administrationCode, String administrationName
    ) {
    }

    /** GET /api/v1/regions/commercials/{commercialCode}/administration */
    public record CommercialAreaQueryResult(
        String commercialCode, String commercialName,
        String districtCode, String districtName,
        String administrationCode, String administrationName
    ) {
    }

    private RegionTargetQueryResults() {
    }
}
