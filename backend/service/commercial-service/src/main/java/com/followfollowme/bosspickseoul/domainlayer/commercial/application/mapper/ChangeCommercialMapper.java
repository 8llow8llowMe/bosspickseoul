package com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.ChangeCommercialEntity;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ChangeCommercial;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ChangeCommercialMapper {

    ChangeCommercial toDomainFromEntity(ChangeCommercialEntity entity);
}
