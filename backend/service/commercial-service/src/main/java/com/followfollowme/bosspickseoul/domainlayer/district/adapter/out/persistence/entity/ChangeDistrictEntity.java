package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity;

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
    name = "change_district",
    indexes = {
        @Index(name = "idx_change_district_period_code", columnList = "periodCode"),
        @Index(name = "idx_change_district_district_code", columnList = "districtCode")
    },
    uniqueConstraints = @UniqueConstraint(
        name = "uk_change_district_period_district_spatial",
        columnNames = {"periodCode", "districtCode", "spatialVersion"}))
public class ChangeDistrictEntity {

    @Id
    @Comment("상권 변화 지표 자치구 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("기준 년분기 코드")
    @Column(length = 5, nullable = false)
    private String periodCode;

    @Comment("공간 스냅샷 버전. 같은 자치구 코드라도 20233 과 2024 표준단위구역을 구분한다")
    @Column(length = 64, nullable = false)
    private String spatialVersion;

    @Comment("자치구 코드")
    @Column(length = 5, nullable = false)
    private String districtCode;

    @Comment("자치구명")
    @Column(length = 10, nullable = false)
    private String districtName;

    @Comment("상권 변화 지표 코드")
    @Column(length = 5)
    private String changeIndicatorCode;

    @Comment("상권 변화 지표명")
    @Column(length = 15, nullable = false)
    private String changeIndicatorName;

    @Comment("운영 영업 개월 평균")
    @Column(nullable = false)
    private Integer averageOpenedMonths;

    @Comment("폐업 영업 개월 평균")
    @Column(nullable = false)
    private Integer averageClosedMonths;
}
