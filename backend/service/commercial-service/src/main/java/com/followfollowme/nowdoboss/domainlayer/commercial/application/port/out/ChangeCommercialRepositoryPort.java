package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.ChangeCommercial;
import java.util.List;
import java.util.Optional;

public interface ChangeCommercialRepositoryPort {

    Optional<ChangeCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);

    List<ChangeCommercial> findAllByPeriodCodeAndCommercialCodeIn(String periodCode, List<String> commercialCodes);
}
