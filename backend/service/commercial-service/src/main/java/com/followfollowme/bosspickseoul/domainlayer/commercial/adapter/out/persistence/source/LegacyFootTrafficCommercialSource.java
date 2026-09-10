package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.FootTrafficCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.FootTrafficCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** 레거시 {@code foot_traffic_commercial} 테이블(20233 까지)에서 읽는다. */
@Component
@RequiredArgsConstructor
public class LegacyFootTrafficCommercialSource {

    private final FootTrafficCommercialRepository footTrafficCommercialRepository;
    private final FootTrafficCommercialMapper footTrafficCommercialMapper;

    public Optional<FootTrafficCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        return footTrafficCommercialRepository.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .map(footTrafficCommercialMapper::toDomainFromEntity);
    }

    public List<FootTrafficCommercial> findByCommercialCodeAndPeriodCodeIn(String commercialCode, List<String> periodCodes) {
        if (periodCodes.isEmpty()) {
            return List.of();
        }
        return footTrafficCommercialRepository.findByCommercialCodeAndPeriodCodeIn(commercialCode, periodCodes)
            .stream()
            .map(footTrafficCommercialMapper::toDomainFromEntity)
            .toList();
    }
}
