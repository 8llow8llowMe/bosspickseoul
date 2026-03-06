package com.followfollowme.nowdoboss.domainlayer.region.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.region.application.info.RegionCodeLookupInfo;
import com.followfollowme.nowdoboss.domainlayer.region.domain.model.AreaCommercial;
import java.util.List;
import java.util.Optional;

public interface AreaCommercialRepositoryPort {

    List<AreaCommercial> findAllByDistrictCode(String districtCode);

    List<AreaCommercial> findAllByAdministrationCode(String administrationCode);

    Optional<RegionCodeLookupInfo> findDistinctByDistrictCodeName(String districtCodeName);

    Optional<RegionCodeLookupInfo> findDistinctByAdministrationCodeName(String administrationCodeName);

    Optional<RegionCodeLookupInfo> findDistinctByCommercialCodeName(String commercialCodeName);

    Optional<AreaCommercial> findFirstByCommercialCode(String commercialCode);
}
