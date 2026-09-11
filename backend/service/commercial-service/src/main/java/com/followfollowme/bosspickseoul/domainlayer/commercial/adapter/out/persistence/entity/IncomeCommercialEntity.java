package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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
    name = "income_commercial",
    indexes = {
        @Index(name = "idx_income_commercial_period_code_commercial_code", columnList = "periodCode, commercialCode")
    },
    uniqueConstraints = @UniqueConstraint(
        name = "uk_income_commercial_period_commercial_spatial",
        columnNames = {"periodCode", "commercialCode", "spatialVersion"}))
public class IncomeCommercialEntity {

    @Id
    @Comment("소득소비_상권 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("기준 년분기 코드")
    @Column(length = 5, nullable = false)
    private String periodCode;

    @Comment("공간 스냅샷 버전. 같은 상권 코드라도 20233 과 2024 표준단위구역을 구분한다")
    @Column(length = 64, nullable = false)
    private String spatialVersion;

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

    @Comment("월 평균 소득 금액. 2024년 이후 원천에는 없다")
    private Long monthlyAverageIncomeAmount;

    @Comment("소득 구간 코드. 2024년 이후 원천에는 없다")
    private Integer incomeBracketCode;

    @Comment("총 지출 금액")
    @Column(nullable = false)
    private Long totalExpenseAmount;

    @Comment("식료품 지출 금액")
    @Column(nullable = false)
    private Long groceryExpenseAmount;

    @Comment("의류/신발 지출 금액")
    @Column(nullable = false)
    private Long clothingExpenseAmount;

    @Comment("의료비 지출 금액")
    @Column(nullable = false)
    private Long medicalExpenseAmount;

    @Comment("생활용품 지출 금액")
    @Column(nullable = false)
    private Long householdExpenseAmount;

    @Comment("교통 지출 금액")
    @Column(nullable = false)
    private Long transportationExpenseAmount;

    @Comment("여가 지출 금액")
    @Column(nullable = false)
    private Long leisureExpenseAmount;

    @Comment("문화 지출 금액")
    @Column(nullable = false)
    private Long cultureExpenseAmount;

    @Comment("교육 지출 금액")
    @Column(nullable = false)
    private Long educationExpenseAmount;

    @Comment("유흥 지출 금액")
    @Column(nullable = false)
    private Long entertainmentExpenseAmount;
}