package com.followfollowme.nowdoboss.domainlayer.district.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query.SalesAdministrationTopFiveQueryResult;
import java.util.List;

public interface SalesAdministrationRepositoryPort {

    List<SalesAdministrationTopFiveQueryResult> findTopFiveByDistrictCode(
        String districtCode,
        String currentPeriodCode,
        String previousPeriodCode
    );
}
