package com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.FootTrafficCommercialEntity;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface FootTrafficCommercialMapper {

    // 엔티티 -> 도메인
    FootTrafficCommercial toDomainFromEntity(FootTrafficCommercialEntity entity);
}
