package com.followfollowme.nowdoboss.domainlayer.category.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.category.adapter.out.persistence.entity.ServiceCategoryEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceCategoryRepository extends JpaRepository<ServiceCategoryEntity, Long> {

    // 여러 서비스 업종 코드로 조회 (상권 내 존재 업종 조회용)
    List<ServiceCategoryEntity> findByServiceCodeIn(List<String> serviceCodes);
}
