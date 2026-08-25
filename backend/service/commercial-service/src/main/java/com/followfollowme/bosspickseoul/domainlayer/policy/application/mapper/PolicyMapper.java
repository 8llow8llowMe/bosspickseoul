package com.followfollowme.bosspickseoul.domainlayer.policy.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.entity.PolicyEntity;
import com.followfollowme.bosspickseoul.domainlayer.policy.domain.model.Policy;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface PolicyMapper {

    Policy toDomain(PolicyEntity entity);
}
