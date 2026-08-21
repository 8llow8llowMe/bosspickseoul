package com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import java.util.List;
import java.util.Optional;

public interface FootTrafficCommercialRepositoryPort {

    Optional<FootTrafficCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);

    List<FootTrafficCommercial> findByCommercialCodeAndPeriodCodeIn(String commercialCode, List<String> periodCodes);
}
