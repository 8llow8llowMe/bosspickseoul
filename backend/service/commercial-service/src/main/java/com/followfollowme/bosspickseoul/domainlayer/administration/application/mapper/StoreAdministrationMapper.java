package com.followfollowme.bosspickseoul.domainlayer.administration.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.StoreAdministrationEntity;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.StoreAdministration;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface StoreAdministrationMapper {

    StoreAdministration toDomainFromEntity(StoreAdministrationEntity entity);
}
