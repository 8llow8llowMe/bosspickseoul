package com.followfollowme.nowdoboss.domainlayer.region.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.region.application.info.DistrictAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.RegionCodeLookupInfo;
import com.followfollowme.nowdoboss.domainlayer.region.domain.model.CommercialRegionMapping;
import java.util.List;
import java.util.Optional;

public interface CommercialRegionMappingRepositoryPort {

    List<CommercialRegionMapping> findAllByDistrictCode(String districtCode);

    List<CommercialRegionMapping> findAllByAdministrationCode(String administrationCode);

    Optional<RegionCodeLookupInfo> findDistinctByDistrictName(String districtName);

    Optional<RegionCodeLookupInfo> findDistinctByAdministrationName(String administrationName);

    Optional<RegionCodeLookupInfo> findDistinctByCommercialName(String commercialName);

    Optional<CommercialRegionMapping> findFirstByAdministrationCode(String administrationCode);

    Optional<CommercialRegionMapping> findFirstByCommercialCode(String commercialCode);

    Optional<DistrictAreaInfo> findFirstByDistrictCode(String districtCode);
}
