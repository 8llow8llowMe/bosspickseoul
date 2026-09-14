package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.IncomeCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.IncomeCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.IncomeCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class IncomeCommercialRepositoryAdapter implements IncomeCommercialRepositoryPort {

    private final IncomeCommercialRepository incomeCommercialRepository;
    private final IncomeCommercialMapper incomeCommercialMapper;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public Optional<IncomeCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        return incomeCommercialRepository
            .findByPeriodCodeAndCommercialCodeAndSpatialVersion(periodCode, commercialCode, datasetSpatialVersion.value())
            .map(incomeCommercialMapper::toDomainFromEntity);
    }

    @Override
    public List<IncomeCommercial> findAllByPeriodCodeAndCommercialCodeIn(String periodCode, List<String> commercialCodes) {
        return incomeCommercialRepository
            .findAllByPeriodCodeAndSpatialVersionAndCommercialCodeIn(
                periodCode, datasetSpatialVersion.value(), commercialCodes)
            .stream()
            .map(incomeCommercialMapper::toDomainFromEntity)
            .toList();
    }
}
