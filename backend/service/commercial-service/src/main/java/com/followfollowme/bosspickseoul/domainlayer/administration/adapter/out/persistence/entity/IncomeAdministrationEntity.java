package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity;

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
    name = "income_administration",
    indexes = {
        @Index(name = "idx_income_administration_period_code_administration_code", columnList = "periodCode, administrationCode")
    },
    uniqueConstraints = @UniqueConstraint(
        name = "uk_income_admin_period_admin_spatial",
        columnNames = {"periodCode", "administrationCode", "spatialVersion"}))
public class IncomeAdministrationEntity {

    @Id
    @Comment("소득소비_행정동 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("기준 년분기 코드")
    @Column(length = 5, nullable = false)
    private String periodCode;

    @Comment("공간 스냅샷 버전. 같은 행정동 코드라도 20233 과 2024 표준단위구역을 구분한다")
    @Column(length = 64, nullable = false)
    private String spatialVersion;

    @Comment("행정동 코드")
    @Column(length = 10, nullable = false)
    private String administrationCode;

    @Comment("행정동명")
    @Column(length = 20, nullable = false)
    private String administrationName;

    @Comment("총 지출 금액")
    @Column(nullable = false)
    private Long totalExpenseAmount;

    // 세부 10항목은 이슈 #415 로 넓혔다. 상권 소비가 끊겨 행정동 소비를 대체 원천으로 쓴다.
    // 기존 행은 총액만 적재돼 있어 재이관(--job=project) 전까지 NULL 이므로 nullable 로 둔다.
    // 항목 구성이 income_commercial 과 다르다. 여가·문화는 원천이 합산본만 주고, 기타·음식이 더 있다.

    @Comment("식료품 지출 금액")
    @Column
    private Long groceryExpenseAmount;

    @Comment("의류/신발 지출 금액")
    @Column
    private Long clothingExpenseAmount;

    @Comment("생활용품 지출 금액")
    @Column
    private Long householdExpenseAmount;

    @Comment("의료비 지출 금액")
    @Column
    private Long medicalExpenseAmount;

    @Comment("교통 지출 금액")
    @Column
    private Long transportationExpenseAmount;

    @Comment("교육 지출 금액")
    @Column
    private Long educationExpenseAmount;

    @Comment("유흥 지출 금액")
    @Column
    private Long entertainmentExpenseAmount;

    @Comment("여가/문화 합산 지출 금액. 원천이 합산본만 주므로 상권의 여가·문화 분리 컬럼과 다른 값이다")
    @Column
    private Long leisureCultureExpenseAmount;

    @Comment("기타 지출 금액. 상권 소비에는 없는 항목이다")
    @Column
    private Long otherExpenseAmount;

    @Comment("음식(외식) 지출 금액. 식료품(groceryExpenseAmount)과 다른 항목이며 상권 소비에는 없다")
    @Column
    private Long diningExpenseAmount;
}
