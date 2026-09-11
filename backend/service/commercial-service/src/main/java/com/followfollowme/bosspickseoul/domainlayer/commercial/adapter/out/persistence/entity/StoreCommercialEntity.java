package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity;

import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
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
    name = "store_commercial",
    indexes = {
        @Index(name = "idx_store_commercial_period_code_commercial_code_service_code", columnList = "periodCode, commercialCode, serviceCode"),
        @Index(name = "idx_store_commercial_period_code_commercial_code_service_type", columnList = "periodCode, commercialCode, serviceType")
    },
    uniqueConstraints = @UniqueConstraint(
        name = "uk_store_commercial_period_code_svc_spatial",
        columnNames = {"periodCode", "commercialCode", "serviceCode", "spatialVersion"}))
public class StoreCommercialEntity {

    @Id
    @Comment("점포_상권 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("기준 년분기 코드")
    @Column(length = 5, nullable = false)
    private String periodCode;

    @Comment("공간 스냅샷 버전. 같은 상권 코드라도 20233 과 2024 표준단위구역을 구분한다")
    @Column(length = 64, nullable = false)
    private String spatialVersion;

    @Comment("상권 구분 코드")
    @Column(length = 1, nullable = false)
    private String commercialClassificationCode;

    @Comment("상권 구분명")
    @Column(length = 4, nullable = false)
    private String commercialClassificationName;

    @Comment("상권 코드")
    @Column(length = 8, nullable = false)
    private String commercialCode;

    @Comment("상권명")
    @Column(length = 80, nullable = false)
    private String commercialName;

    @Comment("서비스 업종 코드")
    @Column(length = 8, nullable = false)
    private String serviceCode;

    @Comment("서비스 업종명")
    @Column(length = 20, nullable = false)
    private String serviceName;

    @Comment("서비스 업종 타입")
    @Enumerated(EnumType.STRING)
    private ServiceType serviceType;

    @Comment("총 점포 수")
    @Column(nullable = false)
    private Long totalStoreCount;

    @Comment("유사 업종 점포 수")
    @Column(nullable = false)
    private Long similarStoreCount;

    @Comment("개업률")
    @Column(nullable = false)
    private Double openingRate;

    @Comment("개업 점포 수")
    @Column(nullable = false)
    private Long openedStoreCount;

    @Comment("폐업률")
    @Column(nullable = false)
    private Double closureRate;

    @Comment("폐업 점포 수")
    @Column(nullable = false)
    private Long closedStoreCount;

    @Comment("프랜차이즈 점포 수")
    @Column(nullable = false)
    private Long franchiseStoreCount;
}