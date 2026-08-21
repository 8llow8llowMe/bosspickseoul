package com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.PopulationCommercialEntity;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.PopulationCommercial;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PopulationCommercialMapper {

    // 엔티티 -> 도메인
    PopulationCommercial toDomainFromEntity(PopulationCommercialEntity entity);
}
