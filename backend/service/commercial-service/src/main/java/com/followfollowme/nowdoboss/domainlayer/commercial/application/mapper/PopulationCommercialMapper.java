package com.followfollowme.nowdoboss.domainlayer.commercial.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.entity.PopulationCommercialEntity;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.PopulationCommercial;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PopulationCommercialMapper {

    // 엔티티 -> 도메인
    PopulationCommercial toDomainFromEntity(PopulationCommercialEntity entity);
}
