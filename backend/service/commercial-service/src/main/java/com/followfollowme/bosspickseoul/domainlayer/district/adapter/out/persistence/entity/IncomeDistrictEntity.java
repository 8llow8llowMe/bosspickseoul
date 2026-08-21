package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity;

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
    name = "income_district",
    indexes = {
        @Index(name = "idx_income_district_period_code", columnList = "periodCode"),
        @Index(name = "idx_income_district_district_code", columnList = "districtCode")
    })
public class IncomeDistrictEntity {

    @Id
    @Comment("소득소비_자치구 아이디")
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

    @Comment("총 지출 금액")
    @Column(nullable = false)
    private Long totalExpenseAmount;
}
