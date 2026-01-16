package com.followfollowme.nowdoboss.domainlayer.commercial.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.entity.SalesCommercialEntity;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface SalesCommercialMapper {

    // 엔티티 -> 도메인
    SalesCommercial toDomainFromEntity(SalesCommercialEntity entity);
}
