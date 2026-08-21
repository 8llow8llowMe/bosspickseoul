package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.SalesAdministrationTopFiveQueryResult;
import java.util.List;

public interface SalesAdministrationRepositoryPort {

    List<SalesAdministrationTopFiveQueryResult> findTopFiveByDistrictCode(
        String districtCode,
        String currentPeriodCode,
        String previousPeriodCode
    );
}
