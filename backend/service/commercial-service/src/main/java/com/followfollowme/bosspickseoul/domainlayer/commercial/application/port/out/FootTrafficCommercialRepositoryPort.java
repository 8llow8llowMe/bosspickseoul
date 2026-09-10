package com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import java.util.List;
import java.util.Optional;

public interface FootTrafficCommercialRepositoryPort {

    Optional<FootTrafficCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);

    /** 요청한 분기 중 존재하는 것만 돌려준다. 순서는 보장하지 않으므로 호출자가 분기 코드로 다시 정렬·조립한다. */
    List<FootTrafficCommercial> findByCommercialCodeAndPeriodCodeIn(String commercialCode, List<String> periodCodes);
}
