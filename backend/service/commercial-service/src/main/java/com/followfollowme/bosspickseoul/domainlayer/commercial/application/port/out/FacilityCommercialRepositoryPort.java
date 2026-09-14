package com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FacilityCommercial;
import java.util.List;
import java.util.Optional;

public interface FacilityCommercialRepositoryPort {

    Optional<FacilityCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);

    List<FacilityCommercial> findAllByPeriodCodeAndCommercialCodeIn(String periodCode, List<String> commercialCodes);
}
