package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record DistrictSalesServiceTopQueryResult(String serviceCode, String serviceName, double salesChangeRate) {

}

