package com.followfollowme.nowdoboss.domainlayer.district.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity.FootTrafficDistrictEntity;
import com.followfollowme.nowdoboss.domainlayer.district.domain.model.FootTrafficDistrict;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface FootTrafficDistrictMapper {

    // 엔티티 -> 도메인
    FootTrafficDistrict toDomainFromEntity(FootTrafficDistrictEntity entity);
}
