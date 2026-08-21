package com.followfollowme.bosspickseoul.domainlayer.category.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.category.adapter.out.persistence.entity.ServiceCategoryEntity;
import com.followfollowme.bosspickseoul.domainlayer.category.domain.model.ServiceCategory;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ServiceCategoryMapper {

    // 엔티티 -> 도메인
    ServiceCategory toDomainFromEntity(ServiceCategoryEntity entity);

    // 엔티티 리스트 -> 도메인 리스트
    List<ServiceCategory> toDomainListFromEntityList(List<ServiceCategoryEntity> entities);
}
