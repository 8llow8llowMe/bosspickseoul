package com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.entity.PolicyEntity;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PolicyRepository extends JpaRepository<PolicyEntity, Long> {

    /**
     * 신청 가능한 정책을 지역·업종 범위로 조회한다.
     *
     * <p>지역/업종 조건은 "지정한 값과 일치하거나, 제한이 없는(NULL) 정책"을 모두 포함한다.
     * 정렬은 자치구 지정 정책을 앞에 두고(구체적인 것이 유용하다), 그다음 마감 임박순이다.
     * 상시 모집(마감일 NULL)은 급하지 않으므로 기한이 있는 정책 뒤로 보낸다.
     */
    @Query("""
        SELECT p FROM PolicyEntity p
        WHERE (p.applyStartAt IS NULL OR p.applyStartAt <= :baseDate)
          AND (p.applyEndAt IS NULL OR p.applyEndAt >= :baseDate)
          AND (:districtCode IS NULL OR p.districtCode IS NULL OR p.districtCode = :districtCode)
          AND (:serviceCategoryCode IS NULL OR p.serviceCategoryCode IS NULL
               OR p.serviceCategoryCode = :serviceCategoryCode)
        ORDER BY
          CASE WHEN p.districtCode IS NOT NULL THEN 0 ELSE 1 END,
          CASE WHEN p.applyEndAt IS NULL THEN 1 ELSE 0 END,
          p.applyEndAt ASC,
          p.id DESC
        """)
    List<PolicyEntity> findRecommendations(
        @Param("districtCode") String districtCode,
        @Param("serviceCategoryCode") String serviceCategoryCode,
        @Param("baseDate") LocalDate baseDate,
        Pageable pageable
    );
}
