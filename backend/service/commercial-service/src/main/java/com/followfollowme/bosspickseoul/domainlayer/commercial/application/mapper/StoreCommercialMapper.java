package com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.StoreCommercialEntity;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.StoreCommercial;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface StoreCommercialMapper {

    StoreCommercial toDomainFromEntity(StoreCommercialEntity entity);
}
