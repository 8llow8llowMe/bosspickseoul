package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.ChangeCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.ChangeCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.ChangeCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 상권 변화지표는 {@code change_commercial} 컬럼만 읽는다. JSON 릴리스 경로는 두지 않는다.
 * {@code spatial_version} 은 요청이 아니라 배포 설정({@code DATASET_SPATIAL_VERSION})이다.
 */
@Component
@RequiredArgsConstructor
public class ChangeCommercialRepositoryAdapter implements ChangeCommercialRepositoryPort {

    private final ChangeCommercialRepository changeCommercialRepository;
    private final ChangeCommercialMapper changeCommercialMapper;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public Optional<ChangeCommercial> findByPeriodCodeAndCommercialCode(
        String periodCode, String commercialCode
    ) {
        return changeCommercialRepository
            .findByPeriodCodeAndCommercialCodeAndSpatialVersion(
                periodCode, commercialCode, datasetSpatialVersion.value())
            .map(changeCommercialMapper::toDomainFromEntity);
    }

    @Override
    public List<ChangeCommercial> findAllByPeriodCodeAndCommercialCodeIn(
        String periodCode, List<String> commercialCodes
    ) {
        return changeCommercialRepository
            .findAllByPeriodCodeAndSpatialVersionAndCommercialCodeIn(
                periodCode, datasetSpatialVersion.value(), commercialCodes)
            .stream()
            .map(changeCommercialMapper::toDomainFromEntity)
            .toList();
    }
}
