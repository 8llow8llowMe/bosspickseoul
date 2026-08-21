package com.followfollowme.bosspickseoul.domainlayer.category.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import lombok.Builder;

@Builder
public record ServiceCategory(
    long id,
    String serviceCode,
    String serviceCodeName,
    ServiceType serviceType
) {

}
