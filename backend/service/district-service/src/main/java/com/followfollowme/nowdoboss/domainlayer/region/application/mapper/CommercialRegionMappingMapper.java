package com.followfollowme.nowdoboss.domainlayer.region.application.mapper;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.entity.CommercialRegionMappingEntity;
import com.followfollowme.nowdoboss.domainlayer.region.domain.model.CommercialRegionMapping;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CommercialRegionMappingMapper {

    // 엔티티 -> 도메인
    CommercialRegionMapping toDomainFromEntity(CommercialRegionMappingEntity entity);

    // 엔티티 리스트 -> 도메인 리스트
    List<CommercialRegionMapping> toDomainListFromEntityList(List<CommercialRegionMappingEntity> entities);
}
