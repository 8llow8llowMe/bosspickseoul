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

    @Comment("상권 구분명")
    @Column(length = 4, nullable = false)
    private String commercialClassificationName;

    @Comment("상권 코드")
    @Column(length = 8, nullable = false)
    private String commercialCode;

    @Comment("상권명")
    @Column(length = 80, nullable = false)
    private String commercialName;

    @Comment("총 상주인구 수")
    @Column(nullable = false)
    private Long totalResidentPopulation;

    @Comment("남성 상주인구 수")
    @Column(nullable = false)
    private Long maleResidentPopulation;

    @Comment("여성 상주인구 수")
    @Column(nullable = false)
    private Long femaleResidentPopulation;

    @Comment("10대 상주인구 수")
    @Column(name = "age10_resident_population", nullable = false)
    private Long age10ResidentPopulation;

    @Comment("20대 상주인구 수")
    @Column(name = "age20_resident_population", nullable = false)
    private Long age20ResidentPopulation;

    @Comment("30대 상주인구 수")
    @Column(name = "age30_resident_population", nullable = false)
    private Long age30ResidentPopulation;

    @Comment("40대 상주인구 수")
    @Column(name = "age40_resident_population", nullable = false)
    private Long age40ResidentPopulation;

    @Comment("50대 상주인구 수")
    @Column(name = "age50_resident_population", nullable = false)
    private Long age50ResidentPopulation;

    @Comment("60대 이상 상주인구 수")
    @Column(name = "age60_plus_resident_population", nullable = false)
    private Long age60PlusResidentPopulation;
}
