package com.followfollowme.nowdoboss.domainlayer.district.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity.StoreDistrictEntity;
import com.followfollowme.nowdoboss.domainlayer.district.domain.model.StoreDistrict;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface StoreDistrictMapper {

    // 엔티티 -> 도메인
    StoreDistrict toDomainFromEntity(StoreDistrictEntity entity);
}
