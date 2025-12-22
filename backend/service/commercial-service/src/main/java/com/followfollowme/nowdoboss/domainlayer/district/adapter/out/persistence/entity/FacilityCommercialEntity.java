package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity;

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

    @Comment("상권 구분 코드명")
    @Column(length = 4, nullable = false)
    private String commercialClassificationCodeName;

    @Comment("상권 코드")
    @Column(length = 8, nullable = false)
    private String commercialCode;

    @Comment("상권 코드명")
    @Column(length = 80, nullable = false)
    private String commercialCodeName;

    @Comment("집객 시설 수")
    private Long facilityCnt;

    @Comment("초등학교 수")
    private Long elementarySchoolCnt;

    @Comment("중학교 수")
    private Long middleSchoolCnt;

    @Comment("고등학교 수")
    private Long highSchoolCnt;

    @Comment("대학교 수")
    private Long universityCnt;

    @Comment("지하철 역 수")
    private Long subwayStationCnt;

    @Comment("버스 정거장 수")
    private Long busStopCnt;
}
