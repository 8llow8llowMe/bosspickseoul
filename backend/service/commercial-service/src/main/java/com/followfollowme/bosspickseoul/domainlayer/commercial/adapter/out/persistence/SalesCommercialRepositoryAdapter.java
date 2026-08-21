package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.SalesCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.SalesCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.SalesCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.SalesCommercial;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SalesCommercialRepositoryAdapter implements SalesCommercialRepositoryPort {

    private final SalesCommercialRepository salesCommercialRepository;
    private final SalesCommercialMapper salesCommercialMapper;

    @Override
    public List<String> findDistinctServiceCodesByCommercialCode(String commercialCode) {
        return salesCommercialRepository.findDistinctServiceCodesByCommercialCode(commercialCode);
    }

    @Override
    public Optional<SalesCommercial> findByPeriodCodeAndCommercialCodeAndServiceCode(
        String periodCode, String commercialCode, String serviceCode
    ) {
        return salesCommercialRepository.findByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode)
            .map(salesCommercialMapper::toDomainFromEntity);
    }

    @Override
    public List<SalesCommercial> findByCommercialCodeAndServiceCodeAndPeriodCodeIn(
        String commercialCode,
        String serviceCode,
        List<String> periodCodes
    ) {
        return salesCommercialRepository.findByCommercialCodeAndServiceCodeAndPeriodCodeIn(commercialCode, serviceCode, periodCodes)
            .stream()
            .map(salesCommercialMapper::toDomainFromEntity)
            .toList();
    }
}
