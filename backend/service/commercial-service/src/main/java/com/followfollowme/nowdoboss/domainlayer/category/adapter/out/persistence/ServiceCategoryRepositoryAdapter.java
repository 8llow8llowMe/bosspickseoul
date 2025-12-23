package com.followfollowme.nowdoboss.domainlayer.category.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.category.adapter.out.persistence.entity.ServiceCategoryEntity;
import com.followfollowme.nowdoboss.domainlayer.category.adapter.out.persistence.repository.ServiceCategoryRepository;
import com.followfollowme.nowdoboss.domainlayer.category.application.mapper.ServiceCategoryMapper;
import com.followfollowme.nowdoboss.domainlayer.category.application.port.out.ServiceCategoryRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.category.domain.model.ServiceCategory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ServiceCategoryRepositoryAdapter implements ServiceCategoryRepositoryPort {

    private final ServiceCategoryRepository serviceCategoryRepository;
    private final ServiceCategoryMapper serviceCategoryMapper;

    @Override
    public List<ServiceCategory> findByServiceCodeIn(List<String> serviceCodes) {
        List<ServiceCategoryEntity> entities = serviceCategoryRepository.findByServiceCodeIn(serviceCodes);
        return serviceCategoryMapper.toDomainListFromEntityList(entities);
    }
}
