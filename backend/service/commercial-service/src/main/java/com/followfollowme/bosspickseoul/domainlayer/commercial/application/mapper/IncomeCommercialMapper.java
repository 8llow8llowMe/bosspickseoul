package com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.IncomeCommercialEntity;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface IncomeCommercialMapper {

    IncomeCommercial toDomainFromEntity(IncomeCommercialEntity entity);
}
