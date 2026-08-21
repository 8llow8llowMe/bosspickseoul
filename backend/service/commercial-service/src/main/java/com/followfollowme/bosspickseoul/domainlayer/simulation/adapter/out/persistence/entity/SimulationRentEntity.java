package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
    name = "simulation_rent",
    // 기준 연도별로 데이터를 쌓고, 조회는 활성 연도(app.simulation.data-base-year)만 사용한다.
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_simulation_rent_base_year_district_code", columnNames = {"baseYear", "districtCode"})
    })
@Comment("자치구별 임대료 기준 (창업 시뮬레이션용)")
public class SimulationRentEntity {

    @Id
    @Comment("임대료 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("데이터 기준 연도 (재수집 시 새 연도로 적재)")
    @Column(length = 4, nullable = false)
    private String baseYear;

    @Comment("자치구 코드")
    @Column(length = 5, nullable = false)
    private String districtCode;

    @Comment("자치구명")
    @Column(length = 10, nullable = false)
    private String districtName;

    @Comment("1층 임대료 (3.3㎡당 월환산임대료, 원)")
    @Column(nullable = false)
    private Integer firstFloorRent;

    @Comment("1층 외 임대료 (3.3㎡당 월환산임대료, 원)")
    @Column(nullable = false)
    private Integer otherFloorRent;

    @Comment("전체 층 평균 임대료 (3.3㎡당 월환산임대료, 원)")
    @Column(nullable = false)
    private Integer totalRent;
}
