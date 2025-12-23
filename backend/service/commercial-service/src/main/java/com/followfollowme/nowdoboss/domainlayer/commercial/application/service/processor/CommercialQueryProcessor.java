package com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.category.application.port.out.ServiceCategoryRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.category.domain.model.ServiceCategory;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialServiceCategoryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.SalesCommercialRepositoryPort;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialQueryProcessor {

    private final SalesCommercialRepositoryPort salesCommercialRepositoryPort;
    private final ServiceCategoryRepositoryPort serviceCategoryRepositoryPort;

    public List<CommercialServiceCategoryInfo> getServiceCategoriesByCommercialCode(String commercialCode) {
        // 1. 상권에 존재하는 업종 코드 조회
        List<String> serviceCodes = salesCommercialRepositoryPort.findDistinctServiceCodesByCommercialCode(commercialCode);

        if (serviceCodes.isEmpty()) {
            return List.of();
        }

        // 2. 기준 정보 조회
        List<ServiceCategory> serviceCategories = serviceCategoryRepositoryPort.findByServiceCodeIn(serviceCodes);

        // 3. Info DTO 반환
        return serviceCategories.stream()
            .map(CommercialServiceCategoryInfo::from)
            .toList();
    }
}
