package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FacilityCommercial;
import java.util.Optional;

public interface FacilityCommercialRepositoryPort {

    Optional<FacilityCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);
}
