package com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.PopulationCommercial;
import java.util.Optional;

public interface PopulationCommercialRepositoryPort {

    Optional<PopulationCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);
}
