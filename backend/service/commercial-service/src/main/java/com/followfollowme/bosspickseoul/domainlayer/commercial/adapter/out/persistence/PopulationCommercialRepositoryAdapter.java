package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.PopulationCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.PopulationCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.PopulationCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.PopulationCommercial;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PopulationCommercialRepositoryAdapter implements PopulationCommercialRepositoryPort {

    private final PopulationCommercialRepository populationCommercialRepository;
    private final PopulationCommercialMapper populationCommercialMapper;

    @Override
    public Optional<PopulationCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        return populationCommercialRepository.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .map(populationCommercialMapper::toDomainFromEntity);
    }
}
