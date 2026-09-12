package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.persistence.entity.AreaBoundaryEntity;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.persistence.repository.AreaBoundaryRepository;
import com.followfollowme.bosspickseoul.domainlayer.map.application.mapper.AreaBoundaryMapper;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.AreaBoundaryRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.enums.AreaType;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.model.AreaBoundary;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AreaBoundaryRepositoryAdapter implements AreaBoundaryRepositoryPort {

    private final AreaBoundaryRepository areaBoundaryRepository;
    private final AreaBoundaryMapper areaBoundaryMapper;

    @Override
    public List<AreaBoundary> findAllByAreaTypeAndBoundingBox(AreaType areaType, double minLng, double minLat, double maxLng, double maxLat, int limit) {
        // limit 은 Pageable 로만 표현한다. Pageable 이 포트 계약에 새면 application 이 Spring Data 타입에 묶인다.
        List<AreaBoundaryEntity> entities = areaBoundaryRepository.findAllByAreaTypeAndBoundingBox(
            areaType, minLng, minLat, maxLng, maxLat, PageRequest.of(0, limit)
        );
        return areaBoundaryMapper.toDomainListFromEntityList(entities);
    }
}
