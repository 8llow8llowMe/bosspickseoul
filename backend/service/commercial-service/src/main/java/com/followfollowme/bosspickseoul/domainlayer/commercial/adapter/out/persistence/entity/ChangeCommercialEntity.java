package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity;

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
    name = "change_commercial",
    indexes = {
        @Index(name = "idx_change_commercial_period_code_commercial_code", columnList = "periodCode, commercialCode")
    })
public class ChangeCommercialEntity {

    @Id
    @Comment("상권 변화 지표 상권 아이디")
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

    @Comment("상권 변화 지표 코드 (LL/LH/HL/HH)")
    @Column(length = 5)
    private String changeIndicatorCode;

    @Comment("상권 변화 지표명")
    @Column(length = 50)
    private String changeIndicatorName;

    @Comment("운영 영업 개월 평균")
    private Integer averageOpenedMonths;

    @Comment("폐업 영업 개월 평균")
    private Integer averageClosedMonths;
}
