package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity;

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
    name = "income_administration",
    indexes = {
        @Index(name = "idx_income_administration_period_code_administration_code", columnList = "periodCode, administrationCode")
    })
public class IncomeAdministrationEntity {

    @Id
    @Comment("소득소비_행정동 아이디")
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

    @Comment("총 지출 금액")
    @Column(nullable = false)
    private Long totalExpenseAmount;
}
