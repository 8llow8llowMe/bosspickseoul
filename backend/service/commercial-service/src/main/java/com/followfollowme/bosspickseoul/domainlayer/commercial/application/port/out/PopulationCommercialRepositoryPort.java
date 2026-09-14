package com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.PopulationCommercial;
import java.util.List;
import java.util.Optional;

public interface PopulationCommercialRepositoryPort {

    Optional<PopulationCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);

    List<PopulationCommercial> findAllByPeriodCodeAndCommercialCodeIn(String periodCode, List<String> commercialCodes);
}
