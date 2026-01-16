package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence.entity;

import com.followfollowme.nowdoboss.domainlayer.category.domain.enums.ServiceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
    name = "sales_commercial",
    indexes = {
        @Index(name = "idx_sales_commercial_commercial_code", columnList = "commercialCode"),
        @Index(name = "idx_sales_commercial_period_code_commercial_code_service_code", columnList = "periodCode, commercialCode, serviceCode")
    })
public class SalesCommercialEntity {

    @Id
    @Comment("추정매출_상권 아이디")
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

    @Comment("서비스 업종 코드")
    @Column(length = 8, nullable = false)
    private String serviceCode;

    @Comment("서비스 업종 코드명")
    @Column(length = 20, nullable = false)
    private String serviceCodeName;

    @Comment("서비스 업종 타입")
    @Enumerated(EnumType.STRING)
    private ServiceType serviceType;

    @Comment("당월 매출 금액")
    @Column(nullable = false)
    private Long monthSales;

    @Comment("월요일 매출 금액")
    @Column(nullable = false)
    private Long monSales;

    @Comment("화요일 매출 금액")
    @Column(nullable = false)
    private Long tueSales;

    @Comment("수요일 매출 금액")
    @Column(nullable = false)
    private Long wedSales;

    @Comment("목요일 매출 금액")
    @Column(nullable = false)
    private Long thuSales;

    @Comment("금요일 매출 금액")
    @Column(nullable = false)
    private Long friSales;

    @Comment("토요일 매출 금액")
    @Column(nullable = false)
    private Long satSales;

    @Comment("일요일 매출 금액")
    @Column(nullable = false)
    private Long sunSales;

    @Comment("시간대 00 ~ 06 매출 금액")
    @Column(name = "sales_00", nullable = false)
    private Long sales00;

    @Comment("시간대 06 ~ 11 매출 금액")
    @Column(name = "sales_06", nullable = false)
    private Long sales06;

    @Comment("시간대 11 ~ 14 매출 금액")
    @Column(name = "sales_11", nullable = false)
    private Long sales11;

    @Comment("시간대 14 ~ 17 매출 금액")
    @Column(name = "sales_14", nullable = false)
    private Long sales14;

    @Comment("시간대 17 ~ 21 매출 금액")
    @Column(name = "sales_17", nullable = false)
    private Long sales17;

    @Comment("시간대 21 ~ 24 매출 금액")
    @Column(name = "sales_21", nullable = false)
    private Long sales21;

    @Comment("남성 매출 금액")
    @Column(nullable = false)
    private Long maleSales;

    @Comment("여성 매출 금액")
    @Column(nullable = false)
    private Long femaleSales;

    @Comment("연령대 10 매출 금액")
    @Column(nullable = false)
    private Long teenSales;

    @Comment("연령대 20 매출 금액")
    @Column(nullable = false)
    private Long twentySales;

    @Comment("연령대 30 매출 금액")
    @Column(nullable = false)
    private Long thirtySales;

    @Comment("연령대 40 매출 금액")
    @Column(nullable = false)
    private Long fortySales;

    @Comment("연령대 50 매출 금액")
    @Column(nullable = false)
    private Long fiftySales;

    @Comment("연령대 60 이상 매출 금액")
    @Column(nullable = false)
    private Long sixtySales;

    @Comment("월요일 매출 건수")
    @Column(nullable = false)
    private Long monSalesCount;

    @Comment("화요일 매출 건수")
    @Column(nullable = false)
    private Long tueSalesCount;

    @Comment("수요일 매출 건수")
    @Column(nullable = false)
    private Long wedSalesCount;

    @Comment("목요일 매출 건수")
    @Column(nullable = false)
    private Long thuSalesCount;

    @Comment("금요일 매출 건수")
    @Column(nullable = false)
    private Long friSalesCount;

    @Comment("토요일 매출 건수")
    @Column(nullable = false)
    private Long satSalesCount;

    @Comment("일요일 매출 건수")
    @Column(nullable = false)
    private Long sunSalesCount;

    @Comment("시간대 00 ~ 06 매출 건수")
    @Column(name = "sales_count_00", nullable = false)
    private Long salesCount00;

    @Comment("시간대 06 ~ 11 매출 건수")
    @Column(name = "sales_count_06", nullable = false)
    private Long salesCount06;

    @Comment("시간대 11 ~ 14 매출 건수")
    @Column(name = "sales_count_11", nullable = false)
    private Long salesCount11;

    @Comment("시간대 14 ~ 17 매출 건수")
    @Column(name = "sales_count_14", nullable = false)
    private Long salesCount14;

    @Comment("시간대 17 ~ 21 매출 건수")
    @Column(name = "sales_count_17", nullable = false)
    private Long salesCount17;

    @Comment("시간대 21 ~ 24 매출 건수")
    @Column(name = "sales_count_21", nullable = false)
    private Long salesCount21;

    @Comment("남성 매출 건수")
    @Column(nullable = false)
    private Long maleSalesCount;

    @Comment("여성 매출 건수")
    @Column(nullable = false)
    private Long femaleSalesCount;
}
