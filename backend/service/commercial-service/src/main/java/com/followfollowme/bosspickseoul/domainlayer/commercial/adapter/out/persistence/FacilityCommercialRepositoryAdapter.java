package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.FacilityCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.FacilityCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.FacilityCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FacilityCommercial;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FacilityCommercialRepositoryAdapter implements FacilityCommercialRepositoryPort {

    private final FacilityCommercialRepository facilityCommercialRepository;
    private final FacilityCommercialMapper facilityCommercialMapper;

    @Override
    public Optional<FacilityCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        return facilityCommercialRepository.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .map(facilityCommercialMapper::toDomainFromEntity);
    }
}
