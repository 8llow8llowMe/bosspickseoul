package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.entity;

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
    name = "area_commercial",
    indexes = {
        @Index(name = "idx_area_commercial_district_code", columnList = "districtCode"),
        @Index(name = "idx_area_commercial_administration_code", columnList = "administrationCode")
    })
public class AreaCommercial {

    @Id
    @Comment("영역_상권 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("상권 구분 코드")
    @Column(length = 1, nullable = false)
    private String commercialClassificationCode;

    @Comment("상권 구분 코드명")
    @Column(length = 4, nullable = false)
    private String commercialClassificationCodeName;

    @Comment("상권 코드")
    @Column(length = 8, nullable = false)
    private String commercialCode;

    @Comment("상권 코드명")
    @Column(length = 80, nullable = false)
    private String commercialCodeName;

    @Comment("x 좌표 값")
    @Column(nullable = false)
    private Double x;

    @Comment("y 좌표 값")
    @Column(nullable = false)
    private Double y;

    @Comment("자치구 코드")
    @Column(length = 5, nullable = false)
    private String districtCode;

    @Comment("자치구 코드 명")
    @Column(length = 10, nullable = false)
    private String districtCodeName;

    @Comment("행정동 코드")
    @Column(length = 10, nullable = false)
    private String administrationCode;

    @Comment("행정동 코드 명")
    @Column(length = 20, nullable = false)
    private String administrationCodeName;
}
