package com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
    name = "commercial_region_mapping",
    indexes = {
        @Index(name = "idx_commercial_region_mapping_district_code", columnList = "districtCode"),
        @Index(name = "idx_commercial_region_mapping_administration_code", columnList = "administrationCode")
    })
public class CommercialRegionMappingEntity {

    @Id
    @Comment("영역_상권 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("상권 분류 코드")
    @Column(length = 1, nullable = false)
    private String commercialClassificationCode;

    @Comment("상권 분류명")
    @Column(name = "commercial_classification_name", length = 4, nullable = false)
    private String commercialClassificationName;

    @Comment("상권 코드")
    @Column(length = 8, nullable = false)
    private String commercialCode;

    @Comment("상권명")
    @Column(name = "commercial_name", length = 80, nullable = false)
    private String commercialName;

    @Comment("x 좌표 값")
    @Column(nullable = false)
    private Double x;

    @Comment("y 좌표 값")
    @Column(nullable = false)
    private Double y;

    @Comment("자치구 코드")
    @Column(length = 5, nullable = false)
    private String districtCode;

    @Comment("자치구명")
    @Column(name = "district_name", length = 10, nullable = false)
    private String districtName;

    @Comment("행정동 코드")
    @Column(length = 10, nullable = false)
    private String administrationCode;

    @Comment("행정동명")
    @Column(name = "administration_name", length = 20, nullable = false)
    private String administrationName;
}
