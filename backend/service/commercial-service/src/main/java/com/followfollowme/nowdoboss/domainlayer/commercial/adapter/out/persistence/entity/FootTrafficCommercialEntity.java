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

    @Comment("상권 구분명")
    @Column(length = 4, nullable = false)
    private String commercialClassificationName;

    @Comment("상권 코드")
    @Column(length = 8, nullable = false)
    private String commercialCode;

    @Comment("상권명")
    @Column(length = 80, nullable = false)
    private String commercialName;

    @Comment("총 유동인구 수")
    @Column(nullable = false)
    private Long totalFootTraffic;

    @Comment("남성 유동인구 수")
    @Column(nullable = false)
    private Long maleFootTraffic;

    @Comment("여성 유동인구 수")
    @Column(nullable = false)
    private Long femaleFootTraffic;

    @Comment("10대 유동인구 수")
    @Column(nullable = false)
    private Long age10FootTraffic;

    @Comment("20대 유동인구 수")
    @Column(nullable = false)
    private Long age20FootTraffic;

    @Comment("30대 유동인구 수")
    @Column(nullable = false)
    private Long age30FootTraffic;

    @Comment("40대 유동인구 수")
    @Column(nullable = false)
    private Long age40FootTraffic;

    @Comment("50대 유동인구 수")
    @Column(nullable = false)
    private Long age50FootTraffic;

    @Comment("60대 이상 유동인구 수")
    @Column(nullable = false)
    private Long age60PlusFootTraffic;

    @Comment("00~06시 유동인구 수")
    @Column(name = "foot_traffic_time_00_06", nullable = false)
    private Long footTrafficTime00To06;

    @Comment("06~11시 유동인구 수")
    @Column(name = "foot_traffic_time_06_11", nullable = false)
    private Long footTrafficTime06To11;

    @Comment("11~14시 유동인구 수")
    @Column(name = "foot_traffic_time_11_14", nullable = false)
    private Long footTrafficTime11To14;

    @Comment("14~17시 유동인구 수")
    @Column(name = "foot_traffic_time_14_17", nullable = false)
    private Long footTrafficTime14To17;

    @Comment("17~21시 유동인구 수")
    @Column(name = "foot_traffic_time_17_21", nullable = false)
    private Long footTrafficTime17To21;

    @Comment("21~24시 유동인구 수")
    @Column(name = "foot_traffic_time_21_24", nullable = false)
    private Long footTrafficTime21To24;

    @Comment("월요일 유동인구 수")
    @Column(nullable = false)
    private Long mondayFootTraffic;

    @Comment("화요일 유동인구 수")
    @Column(nullable = false)
    private Long tuesdayFootTraffic;

    @Comment("수요일 유동인구 수")
    @Column(nullable = false)
    private Long wednesdayFootTraffic;

    @Comment("목요일 유동인구 수")
    @Column(nullable = false)
    private Long thursdayFootTraffic;

    @Comment("금요일 유동인구 수")
    @Column(nullable = false)
    private Long fridayFootTraffic;

    @Comment("토요일 유동인구 수")
    @Column(nullable = false)
    private Long saturdayFootTraffic;

    @Comment("일요일 유동인구 수")
    @Column(nullable = false)
    private Long sundayFootTraffic;
}