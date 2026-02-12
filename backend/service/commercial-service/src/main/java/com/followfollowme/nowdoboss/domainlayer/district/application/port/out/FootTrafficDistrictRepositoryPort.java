package com.followfollowme.nowdoboss.domainlayer.district.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictFootTrafficTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.domain.model.FootTrafficDistrict;
import java.util.List;
import java.util.Optional;

public interface FootTrafficDistrictRepositoryPort {

    Optional<FootTrafficDistrict> findByPeriodCodeAndDistrictCode(String periodCode, String districtCode);

    List<DistrictFootTrafficTopTenInfo> findTopTenByFootTraffic(String currentPeriodCode, String previousPeriodCode);
}
