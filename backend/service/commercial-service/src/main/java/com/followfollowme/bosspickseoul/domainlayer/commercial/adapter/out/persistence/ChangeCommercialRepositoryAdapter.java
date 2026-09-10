package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.ChangeCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.ChangeCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.ChangeCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 상권 변화지표는 {@code change_commercial} 컬럼만 읽는다. JSON 릴리스 경로는 두지 않는다.
 * {@code spatial_version} 은 요청이 아니라 배포 설정({@code DATASET_SPATIAL_VERSION})이다.
 */
@Component
public class ChangeCommercialRepositoryAdapter implements ChangeCommercialRepositoryPort {

    private static final String DEFAULT_SPATIAL_VERSION = "legacy-20233";

    private final ChangeCommercialRepository changeCommercialRepository;
    private final ChangeCommercialMapper changeCommercialMapper;
    private final String spatialVersion;

    public ChangeCommercialRepositoryAdapter(
        ChangeCommercialRepository changeCommercialRepository,
        ChangeCommercialMapper changeCommercialMapper,
        @Value("${DATASET_SPATIAL_VERSION:legacy-20233}") String spatialVersion
    ) {
        this.changeCommercialRepository = changeCommercialRepository;
        this.changeCommercialMapper = changeCommercialMapper;
        this.spatialVersion = spatialVersion == null || spatialVersion.isBlank()
            ? DEFAULT_SPATIAL_VERSION : spatialVersion;
    }

    @Override
    public Optional<ChangeCommercial> findByPeriodCodeAndCommercialCode(
        String periodCode, String commercialCode
    ) {
        return changeCommercialRepository
            .findByPeriodCodeAndCommercialCodeAndSpatialVersion(periodCode, commercialCode, spatialVersion)
            .map(changeCommercialMapper::toDomainFromEntity);
    }

    @Override
    public List<ChangeCommercial> findAllByPeriodCodeAndCommercialCodeIn(
        String periodCode, List<String> commercialCodes
    ) {
        return changeCommercialRepository
            .findAllByPeriodCodeAndSpatialVersionAndCommercialCodeIn(periodCode, spatialVersion, commercialCodes)
            .stream()
            .map(changeCommercialMapper::toDomainFromEntity)
            .toList();
    }
}
