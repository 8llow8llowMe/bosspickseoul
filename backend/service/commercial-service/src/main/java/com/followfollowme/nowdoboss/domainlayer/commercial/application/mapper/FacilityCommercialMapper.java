package com.followfollowme.nowdoboss.domainlayer.commercial.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.entity.FacilityCommercialEntity;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FacilityCommercial;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface FacilityCommercialMapper {

    FacilityCommercial toDomainFromEntity(FacilityCommercialEntity entity);
}
