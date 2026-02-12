package com.followfollowme.nowdoboss.domainlayer.district.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictSalesTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.domain.model.SalesDistrict;
import java.util.List;
import java.util.Optional;

public interface SalesDistrictRepositoryPort {

    Optional<SalesDistrict> findByPeriodCodeAndDistrictCodeAndServiceCode(String periodCode, String districtCode, String serviceCode);

    List<DistrictSalesTopTenInfo> findTopTenBySales(String currentPeriodCode, String previousPeriodCode);
}
