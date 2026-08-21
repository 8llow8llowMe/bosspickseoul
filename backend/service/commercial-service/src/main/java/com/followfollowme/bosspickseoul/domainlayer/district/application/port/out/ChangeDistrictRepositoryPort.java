package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.ChangeDistrict;
import java.util.Optional;

public interface ChangeDistrictRepositoryPort {

    Optional<ChangeDistrict> findByPeriodCodeAndDistrictCode(String periodCode, String districtCode);
}
