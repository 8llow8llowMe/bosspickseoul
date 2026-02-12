package com.followfollowme.nowdoboss.domainlayer.district.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity.ChangeDistrictEntity;
import com.followfollowme.nowdoboss.domainlayer.district.domain.model.ChangeDistrict;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ChangeDistrictMapper {

    // 엔티티 -> 도메인
    ChangeDistrict toDomainFromEntity(ChangeDistrictEntity entity);
}
