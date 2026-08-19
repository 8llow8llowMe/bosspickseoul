package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.entity;

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
    name = "simulation_service_type",
    // 기준 연도별로 데이터를 쌓고, 조회는 활성 연도(app.simulation.data-base-year)만 사용한다.
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_simulation_service_type_base_year_service_code", columnNames = {"baseYear", "serviceCode"})
    })
@Comment("업종별 시뮬레이션 기준 정보 — 매장 크기와 권리금 수준")
public class SimulationServiceTypeEntity {

    @Id
    @Comment("시뮬레이션 업종 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("데이터 기준 연도 (재수집 시 새 연도로 적재)")
    @Column(length = 4, nullable = false)
    private String baseYear;

    @Comment("서비스 업종 코드")
    @Column(length = 8, nullable = false)
    private String serviceCode;

    @Comment("서비스 업종명")
    @Column(length = 30, nullable = false)
    private String serviceName;

    @Comment("소형 매장 크기 (㎡)")
    @Column(nullable = false)
    private Integer smallSize;

    @Comment("중형 매장 크기 (㎡)")
    @Column(nullable = false)
    private Integer mediumSize;

    @Comment("대형 매장 크기 (㎡)")
    @Column(nullable = false)
    private Integer largeSize;

    @Comment("권리금 수준 평균 (만원)")
    @Column(nullable = false)
    private Integer keyMoneyAverage;

    @Comment("권리금 수준 ㎡당 평균 (만원/㎡)")
    private Double keyMoneyLevel;

    @Comment("권리금 유 비율 (%)")
    private Double keyMoneyRatio;
}
