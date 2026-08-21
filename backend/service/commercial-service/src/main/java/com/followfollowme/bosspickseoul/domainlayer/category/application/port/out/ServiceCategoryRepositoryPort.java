package com.followfollowme.bosspickseoul.domainlayer.category.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.category.domain.model.ServiceCategory;
import java.util.List;

public interface ServiceCategoryRepositoryPort {

    List<ServiceCategory> findByServiceCodeIn(List<String> serviceCodes);
}
