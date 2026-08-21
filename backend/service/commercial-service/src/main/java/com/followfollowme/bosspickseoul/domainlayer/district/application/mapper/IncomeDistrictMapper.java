package com.followfollowme.bosspickseoul.domainlayer.district.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.IncomeDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.IncomeDistrict;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface IncomeDistrictMapper {

    IncomeDistrict toDomainFromEntity(IncomeDistrictEntity entity);
}
