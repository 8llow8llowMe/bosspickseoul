package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreAdministrationClosedTopFiveQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreAdministrationOpenedTopFiveQueryResult;
import java.util.List;

public interface StoreAdministrationRepositoryPort {

    List<StoreAdministrationOpenedTopFiveQueryResult> findTopFiveOpenedAdministrationsByDistrictCode(
        String districtCode,
        String periodCode
    );

    List<StoreAdministrationClosedTopFiveQueryResult> findTopFiveClosedAdministrationsByDistrictCode(
        String districtCode,
        String periodCode
    );
}
