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
    name = "population_commercial",
    indexes = {
        @Index(name = "idx_population_commercial_period_code_commercial_code", columnList = "periodCode, commercialCode")
    })
public class PopulationCommercialEntity {

    @Id
    @Comment("상주인구_상권 아이디")
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

    @Comment("총 상주인구 수")
    private Long totalPopulation;

    @Comment("남성 상주인구 수")
    private Long malePopulation;

    @Comment("여성 상주인구 수")
    private Long femalePopulation;

    @Comment("연령대 10 상주인구 수")
    private Long teenPopulation;

    @Comment("연령대 20 상주인구 수")
    private Long twentyPopulation;

    @Comment("연령대 30 상주인구 수")
    private Long thirtyPopulation;

    @Comment("연령대 40 상주인구 수")
    private Long fortyPopulation;

    @Comment("연령대 50 상주인구 수")
    private Long fiftyPopulation;

    @Comment("연령대 60 이상 상주인구 수")
    private Long sixtyPopulation;
}
