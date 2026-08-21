package com.followfollowme.bosspickseoul.domainlayer.district.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.ChangeDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.ChangeDistrict;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ChangeDistrictMapper {

    ChangeDistrict toDomainFromEntity(ChangeDistrictEntity entity);
}
