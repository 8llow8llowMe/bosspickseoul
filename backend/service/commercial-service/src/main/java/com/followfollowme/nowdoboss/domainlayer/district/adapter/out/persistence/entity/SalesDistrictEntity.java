package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.enums.ServiceType;
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
    name = "sales_district",
    indexes = {
        @Index(name = "idx_sales_district_period_code", columnList = "periodCode"),
        @Index(name = "idx_sales_district_district_code", columnList = "districtCode"),
        @Index(name = "idx_sales_district_service_code", columnList = "serviceCode")
    })
public class SalesDistrictEntity {

    @Id
    @Comment("추정매출_자치구_아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("기준 년분기 코드")
    @Column(length = 5, nullable = false)
    private String periodCode;

    @Comment("자치구 코드")
    @Column(length = 5, nullable = false)
    private String districtCode;

    @Comment("자치구 코드 명")
    @Column(length = 10, nullable = false)
    private String districtCodeName;

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
    private Long monthSales;

    @Comment("월요일 매출 금액")
    private Long monSales;

    @Comment("화요일 매출 금액")
    private Long tueSales;

    @Comment("수요일 매출 금액")
    private Long wedSales;

    @Comment("목요일 매출 금액")
    private Long thuSales;

    @Comment("금요일 매출 금액")
    private Long friSales;

    @Comment("토요일 매출 금액")
    private Long satSales;

    @Comment("일요일 매출 금액")
    private Long sunSales;

    @Comment("시간대 00 ~ 06 매출 금액")
    @Column(name = "sales_00")
    private Long sales00;

    @Comment("시간대 06 ~ 11 매출 금액")
    @Column(name = "sales_06")
    private Long sales06;

    @Comment("시간대 11 ~ 14 매출 금액")
    @Column(name = "sales_11")
    private Long sales11;

    @Comment("시간대 14 ~ 17 매출 금액")
    @Column(name = "sales_14")
    private Long sales14;

    @Comment("시간대 17 ~ 21 매출 금액")
    @Column(name = "sales_17")
    private Long sales17;

    @Comment("시간대 21 ~ 24 매출 금액")
    @Column(name = "sales_21")
    private Long sales21;

    @Comment("남성 매출 금액")
    private Long maleSales;

    @Comment("여성 매출 금액")
    private Long femaleSales;

    @Comment("10대 매출_금액")
    private Long teenSales;

    @Comment("20대 매출_금액")
    private Long twentySales;

    @Comment("30대 매출_금액")
    private Long thirtySales;

    @Comment("40대 매출_금액")
    private Long fortySales;

    @Comment("50대 매출_금액")
    private Long fiftySales;

    @Comment("60대 매출_금액")
    private Long sixtySales;
}
