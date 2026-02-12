package com.followfollowme.nowdoboss.domainlayer.district.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity.IncomeDistrictEntity;
import com.followfollowme.nowdoboss.domainlayer.district.domain.model.IncomeDistrict;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface IncomeDistrictMapper {

    // 엔티티 -> 도메인
    IncomeDistrict toDomainFromEntity(IncomeDistrictEntity entity);
}
