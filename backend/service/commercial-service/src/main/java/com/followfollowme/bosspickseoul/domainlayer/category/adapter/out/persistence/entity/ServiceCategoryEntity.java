package com.followfollowme.bosspickseoul.domainlayer.category.adapter.out.persistence.entity;

import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Entity
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "service_category",
    // serviceCode 는 업종 코드의 자연키다. 중복이 생기면 배치의 service_type 해석이 어느 행을
    // 잡을지 비결정적이고(ORDER BY 없이 접는다), 조회에서는 같은 업종이 두 번 나간다.
    // 유니크 인덱스가 기존 비유니크 인덱스를 대체하므로 idx_service_category_service_code 는 없앤다.
    // 운영 DB 는 ddl-auto=none 이라 scripts/migration/service-category-service-code-unique-runbook.sql
    // 을 수동 적용해야 실제 제약이 선다.
    uniqueConstraints = @UniqueConstraint(
        name = "uk_service_category_service_code",
        columnNames = {"serviceCode"})
)
public class ServiceCategoryEntity {

    @Id
    @Comment("서비스 업종 카테고리 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("서비스 업종 코드")
    @Column(length = 8, nullable = false)
    private String serviceCode;

    @Comment("서비스 업종 코드명")
    @Column(length = 20, nullable = false)
    private String serviceCodeName;

    @Comment("서비스 업종 타입")
    @Enumerated(EnumType.STRING)
    private ServiceType serviceType;
}
