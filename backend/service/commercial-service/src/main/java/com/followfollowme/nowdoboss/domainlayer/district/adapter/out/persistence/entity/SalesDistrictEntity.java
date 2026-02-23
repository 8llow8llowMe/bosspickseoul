package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity;

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
    name = "sales_district",
    indexes = {
        @Index(name = "idx_sales_district_period_code", columnList = "periodCode"),
        @Index(name = "idx_sales_district_district_code", columnList = "districtCode"),
        @Index(name = "idx_sales_district_service_code", columnList = "serviceCode")
    })
public class SalesDistrictEntity {

    @Id
    @Comment("추정매출_자치구 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("기준 년분기 코드")
    @Column(length = 5, nullable = false)
    private String periodCode;

    @Comment("자치구 코드")
    @Column(length = 5, nullable = false)
    private String districtCode;

    @Comment("자치구명")
    @Column(length = 10, nullable = false)
    private String districtName;

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
}
