package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out;

import java.util.List;

public interface SalesCommercialRepositoryPort {

    List<String> findDistinctServiceCodesByCommercialCode(String commercialCode);
}
