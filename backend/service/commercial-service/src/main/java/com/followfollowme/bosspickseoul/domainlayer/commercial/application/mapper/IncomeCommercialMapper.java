package com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.IncomeCommercialEntity;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface IncomeCommercialMapper {

    // 2024+ 원천에는 소득 두 컬럼이 없다. 도메인이 primitive 라서 null 을 0 으로 둔다.
    @Mapping(target = "monthlyAverageIncomeAmount", defaultValue = "0L")
    @Mapping(target = "incomeBracketCode", defaultValue = "0")
    IncomeCommercial toDomainFromEntity(IncomeCommercialEntity entity);
}
