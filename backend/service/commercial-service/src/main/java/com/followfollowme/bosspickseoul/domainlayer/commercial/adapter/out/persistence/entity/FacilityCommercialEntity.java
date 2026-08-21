package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity;

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
    name = "facility_commercial",
    indexes = {
        @Index(name = "idx_facility_commercial_period_code_commercial_code", columnList = "periodCode, commercialCode")
    })
public class FacilityCommercialEntity {

    @Id
    @Comment("집객시설_상권 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("기준 년분기 코드")
    @Column(length = 5, nullable = false)
    private String periodCode;

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

    @Comment("총 집객 시설 수")
    @Column(nullable = false)
    private Long totalFacilityCount;

    @Comment("초등학교 수")
    @Column(nullable = false)
    private Long elementarySchoolCount;

    @Comment("중학교 수")
    @Column(nullable = false)
    private Long middleSchoolCount;

    @Comment("고등학교 수")
    @Column(nullable = false)
    private Long highSchoolCount;

    @Comment("대학교 수")
    @Column(nullable = false)
    private Long universityCount;

    @Comment("지하철역 수")
    @Column(nullable = false)
    private Long subwayStationCount;

    @Comment("버스정류장 수")
    @Column(nullable = false)
    private Long busStopCount;
}