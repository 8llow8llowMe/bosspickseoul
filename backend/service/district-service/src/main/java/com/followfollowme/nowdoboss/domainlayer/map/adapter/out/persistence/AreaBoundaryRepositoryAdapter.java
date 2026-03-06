package com.followfollowme.nowdoboss.domainlayer.map.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.map.adapter.out.persistence.entity.AreaBoundaryEntity;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.out.persistence.repository.AreaBoundaryRepository;
import com.followfollowme.nowdoboss.domainlayer.map.application.mapper.AreaBoundaryMapper;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.AreaBoundaryRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.map.domain.enums.AreaType;
import com.followfollowme.nowdoboss.domainlayer.map.domain.model.AreaBoundary;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AreaBoundaryRepositoryAdapter implements AreaBoundaryRepositoryPort {

    private final AreaBoundaryRepository areaBoundaryRepository;
    private final AreaBoundaryMapper areaBoundaryMapper;

    @Override
    public List<AreaBoundary> findAllByAreaTypeAndBoundingBox(AreaType areaType, double minLng, double minLat, double maxLng, double maxLat) {
        List<AreaBoundaryEntity> entities = areaBoundaryRepository.findAllByAreaTypeAndBoundingBox(areaType, minLng, minLat, maxLng, maxLat);
        return areaBoundaryMapper.toDomainListFromEntityList(entities);
    }
}
