package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.FootTrafficCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.FootTrafficCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.FootTrafficCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FootTrafficCommercialRepositoryAdapter implements FootTrafficCommercialRepositoryPort {

    private final FootTrafficCommercialRepository footTrafficCommercialRepository;
    private final FootTrafficCommercialMapper footTrafficCommercialMapper;

    @Override
    public Optional<FootTrafficCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        return footTrafficCommercialRepository.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .map(footTrafficCommercialMapper::toDomainFromEntity);
    }

    @Override
    public List<FootTrafficCommercial> findByCommercialCodeAndPeriodCodeIn(String commercialCode, List<String> periodCodes) {
        return footTrafficCommercialRepository.findByCommercialCodeAndPeriodCodeIn(commercialCode, periodCodes)
            .stream()
            .map(footTrafficCommercialMapper::toDomainFromEntity)
            .toList();
    }
}
