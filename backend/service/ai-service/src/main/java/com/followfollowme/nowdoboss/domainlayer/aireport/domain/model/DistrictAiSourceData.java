package com.followfollowme.nowdoboss.domainlayer.aireport.domain.model;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.DistrictDetailQueryResult;

public record DistrictAiSourceData(
    String districtCode,
    String periodCode,
    DistrictDetailQueryResult districtDetail
) {

}
