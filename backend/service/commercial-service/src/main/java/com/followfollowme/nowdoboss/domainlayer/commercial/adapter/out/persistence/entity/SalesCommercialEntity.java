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

    @Comment("상권 구분명")
    @Column(length = 4, nullable = false)
    private String commercialClassificationName;

    @Comment("상권 코드")
    @Column(length = 8, nullable = false)
    private String commercialCode;

    @Comment("상권명")
    @Column(length = 80, nullable = false)
    private String commercialName;

    @Comment("서비스 업종 코드")
    @Column(length = 8, nullable = false)
    private String serviceCode;

    @Comment("서비스 업종명")
    @Column(length = 20, nullable = false)
    private String serviceName;

    @Comment("서비스 업종 타입")
    @Enumerated(EnumType.STRING)
    private ServiceType serviceType;

    @Comment("당월 매출 금액")
    @Column(nullable = false)
    private Long monthlySalesAmount;

    @Comment("월요일 매출 금액")
    @Column(nullable = false)
    private Long mondaySalesAmount;

    @Comment("화요일 매출 금액")
    @Column(nullable = false)
    private Long tuesdaySalesAmount;

    @Comment("수요일 매출 금액")
    @Column(nullable = false)
    private Long wednesdaySalesAmount;

    @Comment("목요일 매출 금액")
    @Column(nullable = false)
    private Long thursdaySalesAmount;

    @Comment("금요일 매출 금액")
    @Column(nullable = false)
    private Long fridaySalesAmount;

    @Comment("토요일 매출 금액")
    @Column(nullable = false)
    private Long saturdaySalesAmount;

    @Comment("일요일 매출 금액")
    @Column(nullable = false)
    private Long sundaySalesAmount;

    @Comment("00~06시 매출 금액")
    @Column(name = "sales_amount_time_00_06", nullable = false)
    private Long salesAmountTime00To06;

    @Comment("06~11시 매출 금액")
    @Column(name = "sales_amount_time_06_11", nullable = false)
    private Long salesAmountTime06To11;

    @Comment("11~14시 매출 금액")
    @Column(name = "sales_amount_time_11_14", nullable = false)
    private Long salesAmountTime11To14;

    @Comment("14~17시 매출 금액")
    @Column(name = "sales_amount_time_14_17", nullable = false)
    private Long salesAmountTime14To17;

    @Comment("17~21시 매출 금액")
    @Column(name = "sales_amount_time_17_21", nullable = false)
    private Long salesAmountTime17To21;

    @Comment("21~24시 매출 금액")
    @Column(name = "sales_amount_time_21_24", nullable = false)
    private Long salesAmountTime21To24;

    @Comment("남성 매출 금액")
    @Column(nullable = false)
    private Long maleSalesAmount;

    @Comment("여성 매출 금액")
    @Column(nullable = false)
    private Long femaleSalesAmount;

    @Comment("10대 매출 금액")
    @Column(nullable = false)
    private Long age10SalesAmount;

    @Comment("20대 매출 금액")
    @Column(nullable = false)
    private Long age20SalesAmount;

    @Comment("30대 매출 금액")
    @Column(nullable = false)
    private Long age30SalesAmount;

    @Comment("40대 매출 금액")
    @Column(nullable = false)
    private Long age40SalesAmount;

    @Comment("50대 매출 금액")
    @Column(nullable = false)
    private Long age50SalesAmount;

    @Comment("60대 이상 매출 금액")
    @Column(nullable = false)
    private Long age60PlusSalesAmount;

    @Comment("월요일 매출 건수")
    @Column(nullable = false)
    private Long mondaySalesCount;

    @Comment("화요일 매출 건수")
    @Column(nullable = false)
    private Long tuesdaySalesCount;

    @Comment("수요일 매출 건수")
    @Column(nullable = false)
    private Long wednesdaySalesCount;

    @Comment("목요일 매출 건수")
    @Column(nullable = false)
    private Long thursdaySalesCount;

    @Comment("금요일 매출 건수")
    @Column(nullable = false)
    private Long fridaySalesCount;

    @Comment("토요일 매출 건수")
    @Column(nullable = false)
    private Long saturdaySalesCount;

    @Comment("일요일 매출 건수")
    @Column(nullable = false)
    private Long sundaySalesCount;

    @Comment("00~06시 매출 건수")
    @Column(name = "sales_count_time_00_06", nullable = false)
    private Long salesCountTime00To06;

    @Comment("06~11시 매출 건수")
    @Column(name = "sales_count_time_06_11", nullable = false)
    private Long salesCountTime06To11;

    @Comment("11~14시 매출 건수")
    @Column(name = "sales_count_time_11_14", nullable = false)
    private Long salesCountTime11To14;

    @Comment("14~17시 매출 건수")
    @Column(name = "sales_count_time_14_17", nullable = false)
    private Long salesCountTime14To17;

    @Comment("17~21시 매출 건수")
    @Column(name = "sales_count_time_17_21", nullable = false)
    private Long salesCountTime17To21;

    @Comment("21~24시 매출 건수")
    @Column(name = "sales_count_time_21_24", nullable = false)
    private Long salesCountTime21To24;

    @Comment("남성 매출 건수")
    @Column(nullable = false)
    private Long maleSalesCount;

    @Comment("여성 매출 건수")
    @Column(nullable = false)
    private Long femaleSalesCount;
}