package com.followfollowme.nowdoboss.domainlayer.category.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.category.domain.model.ServiceCategory;
import java.util.List;

public interface ServiceCategoryRepositoryPort {

    List<ServiceCategory> findByServiceCodeIn(List<String> serviceCodes);
}
