package com.followfollowme.bosspickseoul.domainlayer.district.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.StoreDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.StoreDistrict;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface StoreDistrictMapper {

    StoreDistrict toDomainFromEntity(StoreDistrictEntity entity);
}
