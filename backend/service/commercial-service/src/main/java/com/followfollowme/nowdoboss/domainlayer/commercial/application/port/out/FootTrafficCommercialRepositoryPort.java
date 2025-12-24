package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import java.util.Optional;

public interface FootTrafficCommercialRepositoryPort {

    Optional<FootTrafficCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);
}
