package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.DistrictDetailQueryResult;

public interface DistrictAnalysisQueryPort {

    DistrictDetailQueryResult getDistrictDetail(String districtCode, String periodCode);
}
