package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import java.util.List;
import java.util.Optional;

public interface SalesCommercialRepositoryPort {

    List<String> findDistinctServiceCodesByCommercialCode(String commercialCode);

    Optional<SalesCommercial> findByPeriodCodeAndCommercialCodeAndServiceCode(String periodCode, String commercialCode, String serviceCode);
}
