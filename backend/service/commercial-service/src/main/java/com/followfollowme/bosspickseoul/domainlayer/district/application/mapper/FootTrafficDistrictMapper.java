package com.followfollowme.bosspickseoul.domainlayer.district.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.FootTrafficDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.FootTrafficDistrict;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface FootTrafficDistrictMapper {

    FootTrafficDistrict toDomainFromEntity(FootTrafficDistrictEntity entity);
}
