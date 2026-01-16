package com.followfollowme.nowdoboss.domainlayer.category.domain.model;

import com.followfollowme.nowdoboss.domainlayer.category.domain.enums.ServiceType;
import lombok.Builder;

@Builder
public record ServiceCategory(
    long id,
    String serviceCode,
    String serviceCodeName,
    ServiceType serviceType
) {

}
