package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.repository.ChangeCommercialRepository;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.mapper.ChangeCommercialMapper;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.ChangeCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.ChangeCommercial;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ChangeCommercialRepositoryAdapter implements ChangeCommercialRepositoryPort {

    private final ChangeCommercialRepository changeCommercialRepository;
    private final ChangeCommercialMapper changeCommercialMapper;

    @Override
    public Optional<ChangeCommercial> findByPeriodCodeAndCommercialCode(
        String periodCode, String commercialCode
    ) {
        return changeCommercialRepository
            .findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .map(changeCommercialMapper::toDomainFromEntity);
    }

    @Override
    public List<ChangeCommercial> findAllByPeriodCodeAndCommercialCodeIn(
        String periodCode, List<String> commercialCodes
    ) {
        return changeCommercialRepository
            .findAllByPeriodCodeAndCommercialCodeIn(periodCode, commercialCodes)
            .stream()
            .map(changeCommercialMapper::toDomainFromEntity)
            .toList();
    }
}
