package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.PopulationCommercial;
import java.util.Optional;

public interface PopulationCommercialRepositoryPort {

    Optional<PopulationCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);
}
