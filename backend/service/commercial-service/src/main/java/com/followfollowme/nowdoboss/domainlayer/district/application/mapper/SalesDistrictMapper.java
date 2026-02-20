package com.followfollowme.nowdoboss.domainlayer.district.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity.SalesDistrictEntity;
import com.followfollowme.nowdoboss.domainlayer.district.domain.model.SalesDistrict;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface SalesDistrictMapper {

    SalesDistrict toDomainFromEntity(SalesDistrictEntity entity);
}
