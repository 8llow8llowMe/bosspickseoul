package com.followfollowme.nowdoboss.domainlayer.region.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.entity.AreaCommercialEntity;
import com.followfollowme.nowdoboss.domainlayer.region.domain.model.AreaCommercial;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AreaCommercialMapper {

    // 엔티티 -> 도메인
    AreaCommercial toDomainFromEntity(AreaCommercialEntity entity);

    // 엔티티 리스트 -> 도메인 리스트
    List<AreaCommercial> toDomainListFromEntityList(List<AreaCommercialEntity> entities);
}
