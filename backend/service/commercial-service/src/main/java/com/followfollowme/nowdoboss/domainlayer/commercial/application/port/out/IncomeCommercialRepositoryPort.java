package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.IncomeCommercial;
import java.util.Optional;

public interface IncomeCommercialRepositoryPort {

    Optional<IncomeCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);
}
