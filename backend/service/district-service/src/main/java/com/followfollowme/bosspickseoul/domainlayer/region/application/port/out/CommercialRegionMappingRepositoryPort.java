package com.followfollowme.bosspickseoul.domainlayer.region.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.query.DistrictAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.query.RegionCodeLookupQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.region.domain.model.CommercialRegionMapping;
import java.util.List;
import java.util.Optional;

public interface CommercialRegionMappingRepositoryPort {

    List<CommercialRegionMapping> findAllByDistrictCode(String districtCode);

    List<CommercialRegionMapping> findAllByAdministrationCode(String administrationCode);

    /**
     * 같은 이름의 자치구가 여러 곳일 수 있으므로 다건으로 돌려준다. 단건 판정은 application 계층 책임이다.
     */
    List<RegionCodeLookupQueryResult> findDistinctByDistrictName(String districtName);

    List<RegionCodeLookupQueryResult> findDistinctByAdministrationName(String administrationName);

    List<RegionCodeLookupQueryResult> findDistinctByCommercialName(String commercialName);

    Optional<CommercialRegionMapping> findFirstByAdministrationCode(String administrationCode);

    Optional<CommercialRegionMapping> findFirstByCommercialCode(String commercialCode);

    Optional<DistrictAreaQueryResult> findFirstByDistrictCode(String districtCode);
}
