package com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.SalesCommercialEntity;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.SalesCommercial;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface SalesCommercialMapper {

    // 엔티티 -> 도메인
    SalesCommercial toDomainFromEntity(SalesCommercialEntity entity);
}
