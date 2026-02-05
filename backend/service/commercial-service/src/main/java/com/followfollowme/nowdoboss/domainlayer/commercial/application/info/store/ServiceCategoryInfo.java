package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.store;

import com.followfollowme.nowdoboss.domainlayer.category.domain.enums.ServiceType;
import com.followfollowme.nowdoboss.domainlayer.category.domain.model.ServiceCategory;
import lombok.Builder;

@Builder
public record ServiceCategoryInfo(
    String serviceCode,
    String serviceName,
    ServiceType serviceType
) {

    public static ServiceCategoryInfo from(ServiceCategory serviceCategory) {
        return ServiceCategoryInfo.builder()
            .serviceCode(serviceCategory.serviceCode())
            .serviceName(serviceCategory.serviceCodeName())
            .serviceType(serviceCategory.serviceType())
            .build();
    }
}
