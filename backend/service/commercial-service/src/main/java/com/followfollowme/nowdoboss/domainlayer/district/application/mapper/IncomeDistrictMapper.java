package com.followfollowme.nowdoboss.domainlayer.district.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity.IncomeDistrictEntity;
import com.followfollowme.nowdoboss.domainlayer.district.domain.model.IncomeDistrict;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface IncomeDistrictMapper {

    IncomeDistrict toDomainFromEntity(IncomeDistrictEntity entity);
}
