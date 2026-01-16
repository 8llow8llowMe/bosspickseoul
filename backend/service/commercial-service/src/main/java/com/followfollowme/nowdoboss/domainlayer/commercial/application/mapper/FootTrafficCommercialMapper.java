package com.followfollowme.nowdoboss.domainlayer.commercial.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.entity.FootTrafficCommercialEntity;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface FootTrafficCommercialMapper {

    // 엔티티 -> 도메인
    FootTrafficCommercial toDomainFromEntity(FootTrafficCommercialEntity entity);
}
