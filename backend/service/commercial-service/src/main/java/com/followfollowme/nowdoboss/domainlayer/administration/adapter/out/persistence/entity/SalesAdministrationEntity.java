package com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.entity;

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
    name = "sales_administration",
    indexes = {
        @Index(name = "idx_sales_administration_period_code_administration_code_service_code", columnList = "periodCode, administrationCode, serviceCode")
    })
public class SalesAdministrationEntity {

    @Id
    @Comment("추정매출_행정동 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("기준 년분기 코드")
    @Column(length = 5, nullable = false)
    private String periodCode;

    @Comment("행정동 코드")
    @Column(length = 10, nullable = false)
    private String administrationCode;

    @Comment("행정동명")
    @Column(length = 20, nullable = false)
    private String administrationName;

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

    @Comment("주중 매출 금액")
    @Column(nullable = false)
    private Long weekdaySalesAmount;

    @Comment("주말 매출 금액")
    @Column(nullable = false)
    private Long weekendSalesAmount;
}
