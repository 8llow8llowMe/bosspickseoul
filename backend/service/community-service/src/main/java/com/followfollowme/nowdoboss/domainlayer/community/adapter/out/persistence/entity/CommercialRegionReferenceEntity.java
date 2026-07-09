package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Entity
@Getter
@Table(name = "commercial_region_mapping")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@Comment("상권 영역 참조")
public class CommercialRegionReferenceEntity {

    @Id
    @Comment("상권 영역 아이디")
    private Long id;

    @Column(nullable = false, length = 8)
    @Comment("상권 코드")
    private String commercialCode;

    @Comment("상권명")
    @Column(name = "commercial_name", nullable = false, length = 80)
    private String commercialName;

    @Column(nullable = false, length = 5)
    @Comment("자치구 코드")
    private String districtCode;

    @Comment("자치구명")
    @Column(name = "district_name", nullable = false, length = 10)
    private String districtName;

    @Column(nullable = false, length = 10)
    @Comment("행정동 코드")
    private String administrationCode;

    @Comment("행정동명")
    @Column(name = "administration_name", nullable = false, length = 20)
    private String administrationName;
}
