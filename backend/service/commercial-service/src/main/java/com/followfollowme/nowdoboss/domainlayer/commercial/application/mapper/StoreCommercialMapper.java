package com.followfollowme.nowdoboss.domainlayer.commercial.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.entity.StoreCommercialEntity;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.StoreCommercial;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface StoreCommercialMapper {

    StoreCommercial toDomainFromEntity(StoreCommercialEntity entity);
}
