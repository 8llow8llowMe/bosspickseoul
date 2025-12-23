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
    name = "foot_traffic_district",
    indexes = {
        @Index(name = "idx_foot_traffic_district_period_code", columnList = "periodCode"),
        @Index(name = "idx_foot_traffic_district_district_code", columnList = "districtCode")
    })
public class FootTrafficDistrictEntity {

    @Id
    @Comment("유동인구_자치구_아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("기준 년분기 코드")
    @Column(length = 5, nullable = false)
    private String periodCode;

    @Comment("자치구 코드")
    @Column(length = 5, nullable = false)
    private String districtCode;

    @Comment("자치구 코드명")
    @Column(length = 10, nullable = false)
    private String districtCodeName;

    @Comment("총 유동인구 수")
    @Column(nullable = false)
    private Long totalFootTraffic;

    @Comment("남성 유동인구 수")
    @Column(nullable = false)
    private Long maleFootTraffic;

    @Comment("여성 유동인구 수")
    @Column(nullable = false)
    private Long femaleFootTraffic;

    @Comment("연령대 10 유동인구 수")
    @Column(nullable = false)
    private Long teenFootTraffic;

    @Comment("연령대 20 유동인구 수")
    @Column(nullable = false)
    private Long twentyFootTraffic;

    @Comment("연령대 30 유동인구 수")
    @Column(nullable = false)
    private Long thirtyFootTraffic;

    @Comment("연령대 40 유동인구 수")
    @Column(nullable = false)
    private Long fortyFootTraffic;

    @Comment("연령대 50 유동인구 수")
    @Column(nullable = false)
    private Long fiftyFootTraffic;

    @Comment("연령대 60 유동인구 수")
    @Column(nullable = false)
    private Long sixtyFootTraffic;

    @Comment("시간대 00 ~ 06 유동인구 수")
    @Column(name = "foot_traffic_00", nullable = false)
    private Long footTraffic00;

    @Comment("시간대 06 ~ 11 유동인구 수")
    @Column(name = "foot_traffic_06", nullable = false)
    private Long footTraffic06;

    @Comment("시간대 11 ~ 14 유동인구 수")
    @Column(name = "foot_traffic_11", nullable = false)
    private Long footTraffic11;

    @Comment("시간대 14 ~ 17 유동인구 수")
    @Column(name = "foot_traffic_14", nullable = false)
    private Long footTraffic14;

    @Comment("시간대 17 ~ 21 유동인구 수")
    @Column(name = "foot_traffic_17", nullable = false)
    private Long footTraffic17;

    @Comment("시간대 21 ~ 24 유동인구 수")
    @Column(name = "foot_traffic_21", nullable = false)
    private Long footTraffic21;

    @Comment("월요일 유동인구 수")
    @Column(nullable = false)
    private Long monFootTraffic;

    @Comment("화요일 유동인구 수")
    @Column(nullable = false)
    private Long tueFootTraffic;

    @Comment("수요일 유동인구 수")
    @Column(nullable = false)
    private Long wedFootTraffic;

    @Comment("목요일 유동인구 수")
    @Column(nullable = false)
    private Long thuFootTraffic;

    @Comment("금요일 유동인구 수")
    @Column(nullable = false)
    private Long friFootTraffic;

    @Comment("토요일 유동인구 수")
    @Column(nullable = false)
    private Long satFootTraffic;

    @Comment("일요일 유동인구 수")
    @Column(nullable = false)
    private Long sunFootTraffic;
}
