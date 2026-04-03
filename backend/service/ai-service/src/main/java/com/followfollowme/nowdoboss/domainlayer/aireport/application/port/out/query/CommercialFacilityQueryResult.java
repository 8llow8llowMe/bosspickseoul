package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

public record CommercialFacilityQueryResult(
    long totalFacilityCount,
    CommercialSchoolCountQueryResult schoolCountItem,
    long totalTransportationFacilityCount
) {

}

record CommercialSchoolCountQueryResult(
    long elementarySchoolCount,
    long middleSchoolCount,
    long highSchoolCount,
    long universityCount,
    long totalSchoolCount
) {}
