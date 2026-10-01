package com.followfollowme.bosspickseoul.domainlayer.district.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.PensionIncomeDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.PensionIncomeDistrict;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PensionIncomeDistrictMapper {

    PensionIncomeDistrict toDomainFromEntity(PensionIncomeDistrictEntity entity);
}
