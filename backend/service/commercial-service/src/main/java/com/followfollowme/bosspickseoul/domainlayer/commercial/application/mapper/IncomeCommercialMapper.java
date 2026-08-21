package com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.IncomeCommercialEntity;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface IncomeCommercialMapper {

    // 엔티티 -> 도메인
    IncomeCommercial toDomainFromEntity(IncomeCommercialEntity entity);
}
