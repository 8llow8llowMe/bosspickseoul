package com.followfollowme.nowdoboss.domainlayer.region.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.region.domain.model.AreaCommercial;
import java.util.List;

public interface AreaCommercialRepositoryPort {

    List<AreaCommercial> findAllByDistrictCode(String districtCode);

    List<AreaCommercial> findAllByAdministrationCode(String administrationCode);
}
