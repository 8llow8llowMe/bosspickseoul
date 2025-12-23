package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.entity.SalesCommercialEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SalesCommercialRepository extends JpaRepository<SalesCommercialEntity, Long> {

    @Query("""
            select distinct sc.serviceCode
            from SalesCommercialEntity sc
            where sc.commercialCode = :commercialCode
        """)
    List<String> findDistinctServiceCodesByCommercialCode(String commercialCode);
}
