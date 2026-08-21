package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.IncomeCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.IncomeCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.IncomeCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class IncomeCommercialRepositoryAdapter implements IncomeCommercialRepositoryPort {

    private final IncomeCommercialRepository incomeCommercialRepository;
    private final IncomeCommercialMapper incomeCommercialMapper;

    @Override
    public Optional<IncomeCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        return incomeCommercialRepository.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .map(incomeCommercialMapper::toDomainFromEntity);
    }
}
