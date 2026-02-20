package com.followfollowme.nowdoboss.domainlayer.district.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.district.domain.model.ChangeDistrict;
import java.util.Optional;

public interface ChangeDistrictRepositoryPort {

    Optional<ChangeDistrict> findByPeriodCodeAndDistrictCode(String periodCode, String districtCode);
}
