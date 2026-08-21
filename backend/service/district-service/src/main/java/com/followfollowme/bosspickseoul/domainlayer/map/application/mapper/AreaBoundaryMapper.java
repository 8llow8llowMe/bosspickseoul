package com.followfollowme.bosspickseoul.domainlayer.map.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.persistence.entity.AreaBoundaryEntity;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.model.AreaBoundary;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AreaBoundaryMapper {

    AreaBoundary toDomainFromEntity(AreaBoundaryEntity entity);

    List<AreaBoundary> toDomainListFromEntityList(List<AreaBoundaryEntity> entities);
}
