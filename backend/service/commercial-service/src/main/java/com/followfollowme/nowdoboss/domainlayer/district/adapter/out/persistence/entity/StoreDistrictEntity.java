package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity;

import com.followfollowme.nowdoboss.domainlayer.category.domain.enums.ServiceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
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
    name = "store_district",
    indexes = {
        @Index(name = "idx_store_district_period_code", columnList = "periodCode"),
        @Index(name = "idx_store_district_district_code", columnList = "districtCode"),
        @Index(name = "idx_store_district_service_code", columnList = "serviceCode")
    })
public class StoreDistrictEntity {

    @Id
    @Comment("점포_자치구_아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("기준 년분기 코드")
    @Column(length = 5, nullable = false)
    private String periodCode;

    @Comment("자치구 코드")
    @Column(length = 5, nullable = false)
    private String districtCode;

    @Comment("자치구 코드 명")
    @Column(length = 10, nullable = false)
    private String districtCodeName;

    @Comment("서비스 업종 코드")
    @Column(length = 8, nullable = false)
    private String serviceCode;

    @Comment("서비스 업종 코드명")
    @Column(length = 20, nullable = false)
    private String serviceCodeName;

    @Comment("서비스 업종 타입")
    @Enumerated(EnumType.STRING)
    private ServiceType serviceType;

    @Comment("점포 수")
    @Column(nullable = false)
    private Long totalStore;

    @Comment("유사 업종 점포 수")
    @Column(nullable = false)
    private Long similarStore;

    @Comment("개업 점포 수")
    @Column(nullable = false)
    private Long openedStore;

    @Comment("폐업 점포 수")
    @Column(nullable = false)
    private Long closedStore;

    @Comment("프랜차이즈 점포 수")
    @Column(nullable = false)
    private Long franchiseStore;

    @Comment("개업률")
    @Column(nullable = false)
    private Double openedRate;

    @Comment("폐업률")
    @Column(nullable = false)
    private Double closedRate;
}
