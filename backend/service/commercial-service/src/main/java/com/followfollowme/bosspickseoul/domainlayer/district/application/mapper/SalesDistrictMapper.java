package com.followfollowme.bosspickseoul.domainlayer.district.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.SalesDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.SalesDistrict;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface SalesDistrictMapper {

    SalesDistrict toDomainFromEntity(SalesDistrictEntity entity);
}
