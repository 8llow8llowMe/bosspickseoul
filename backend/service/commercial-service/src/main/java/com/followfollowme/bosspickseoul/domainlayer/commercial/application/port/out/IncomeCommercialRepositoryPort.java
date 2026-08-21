package com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import java.util.Optional;

public interface IncomeCommercialRepositoryPort {

    Optional<IncomeCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);
}
