package com.followfollowme.nowdoboss.domainlayer.district.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.district.domain.model.FootTrafficDistrict;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query.DistrictAreaQueryResult;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query.FootTrafficDistrictTopTenQueryResult;
import java.util.List;
import java.util.Optional;

public interface FootTrafficDistrictRepositoryPort {

    Optional<FootTrafficDistrict> findByPeriodCodeAndDistrictCode(String periodCode, String districtCode);

    List<FootTrafficDistrict> findByPeriodCodeInAndDistrictCodeOrderByPeriodCode(List<String> periodCodes, String districtCode);

    List<DistrictAreaQueryResult> findDistrictAreasByPeriodCode(String periodCode);

    List<FootTrafficDistrictTopTenQueryResult> findTopTenByFootTraffic(String currentPeriodCode, String previousPeriodCode);
}
