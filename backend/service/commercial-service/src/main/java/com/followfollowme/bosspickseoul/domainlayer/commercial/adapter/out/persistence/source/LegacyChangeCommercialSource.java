package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.ChangeCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.ChangeCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** 레거시 {@code change_commercial} 테이블(20233 까지)에서 읽는다. */
@Component
@RequiredArgsConstructor
public class LegacyChangeCommercialSource {

    private final ChangeCommercialRepository changeCommercialRepository;
    private final ChangeCommercialMapper changeCommercialMapper;

    public Optional<ChangeCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        return changeCommercialRepository.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .map(changeCommercialMapper::toDomainFromEntity);
    }

    public List<ChangeCommercial> findAllByPeriodCodeAndCommercialCodeIn(String periodCode, List<String> commercialCodes) {
        return changeCommercialRepository.findAllByPeriodCodeAndCommercialCodeIn(periodCode, commercialCodes)
            .stream()
            .map(changeCommercialMapper::toDomainFromEntity)
            .toList();
    }
}
