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
    name = "foot_traffic_commercial",
    indexes = {
        @Index(name = "idx_foot_traffic_commercial_period_code_commercial_code", columnList = "periodCode, commercialCode")
    })
public class FootTrafficCommercialEntity {

    @Id
    @Comment("유동인구_상권 아이디")
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

    @Comment("총 유동인구 수")
    private Long totalFootTraffic;

    @Comment("남성 유동인구 수")
    private Long maleFootTraffic;

    @Comment("여성 유동인구 수")
    private Long femaleFootTraffic;

    @Comment("연령대 10 유동인구 수")
    private Long teenFootTraffic;

    @Comment("연령대 20 유동인구 수")
    private Long twentyFootTraffic;

    @Comment("연령대 30 유동인구 수")
    private Long thirtyFootTraffic;

    @Comment("연령대 40 유동인구 수")
    private Long fortyFootTraffic;

    @Comment("연령대 50 유동인구 수")
    private Long fiftyFootTraffic;

    @Comment("연령대 60 이상 유동인구 수")
    private Long sixtyFootTraffic;

    @Comment("시간대 00 ~ 06 유동인구 수")
    @Column(name = "foot_traffic_00")
    private Long footTraffic00;

    @Comment("시간대 06 ~ 11 유동인구 수")
    @Column(name = "foot_traffic_06")
    private Long footTraffic06;

    @Comment("시간대 11 ~ 14 유동인구 수")
    @Column(name = "foot_traffic_11")
    private Long footTraffic11;

    @Comment("시간대 14 ~ 17 유동인구 수")
    @Column(name = "foot_traffic_14")
    private Long footTraffic14;

    @Comment("시간대 17 ~ 21 유동인구 수")
    @Column(name = "foot_traffic_17")
    private Long footTraffic17;

    @Comment("시간대 21 ~ 24 유동인구 수")
    @Column(name = "foot_traffic_21")
    private Long footTraffic21;

    @Comment("월요일 유동인구 수")
    private Long monFootTraffic;

    @Comment("화요일 유동인구 수")
    private Long tueFootTraffic;

    @Comment("수요일 유동인구 수")
    private Long wedFootTraffic;

    @Comment("목요일 유동인구 수")
    private Long thuFootTraffic;

    @Comment("금요일 유동인구 수")
    private Long friFootTraffic;

    @Comment("토요일 유동인구 수")
    private Long satFootTraffic;

    @Comment("일요일 유동인구 수")
    private Long sunFootTraffic;
}
