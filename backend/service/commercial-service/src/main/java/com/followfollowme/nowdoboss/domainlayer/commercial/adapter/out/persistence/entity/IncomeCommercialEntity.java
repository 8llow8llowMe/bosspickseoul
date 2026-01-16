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
    name = "income_commercial",
    indexes = {
        @Index(name = "idx_income_commercial_period_code_commercial_code", columnList = "periodCode, commercialCode")
    })
public class IncomeCommercialEntity {

    @Id
    @Comment("소득소비_상권 아이디")
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

    @Comment("월 평균 소득 금액")
    @Column(nullable = false)
    private Long monthAvgIncome;

    @Comment("소득 구간 코드")
    @Column(nullable = false)
    private Integer incomeSectionCode;

    @Comment("지출 총금액")
    @Column(nullable = false)
    private Long totalPrice;

    @Comment("식료품 지출 총금액")
    @Column(nullable = false)
    private Long groceryPrice;

    @Comment("의류 신발 지출 총금액")
    @Column(nullable = false)
    private Long clothesPrice;

    @Comment("의료비 지출 총금액")
    @Column(nullable = false)
    private Long medicalPrice;

    @Comment("생활용품 지출 총금액")
    @Column(nullable = false)
    private Long lifePrice;

    @Comment("교통 지출 총금액")
    @Column(nullable = false)
    private Long trafficPrice;

    @Comment("여가 지출 총금액")
    @Column(nullable = false)
    private Long leisurePrice;

    @Comment("문화 지출 총금액")
    @Column(nullable = false)
    private Long culturePrice;

    @Comment("교육 지출 총금액")
    @Column(nullable = false)
    private Long educationPrice;

    @Comment("유흥 총금액")
    @Column(nullable = false)
    private Long luxuryPrice;
}
