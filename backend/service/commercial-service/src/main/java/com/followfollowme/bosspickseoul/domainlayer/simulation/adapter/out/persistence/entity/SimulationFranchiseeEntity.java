package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.out.persistence.entity;

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
    name = "simulation_franchisee",
    // brandName 검색은 %키워드% 부분 일치라 B-Tree 인덱스를 타지 못한다.
    // (base_year, service_code) 인덱스가 활성 연도 필터 + 커서 페이징을 받치고, 업종당 행 수가 적어 LIKE 후필터로 충분하다.
    indexes = {
        @Index(name = "idx_simulation_franchisee_base_year_service_code", columnList = "baseYear, serviceCode")
    })
@Comment("프랜차이즈 창업 비용 기준 (공정거래위원회 정보공개서 기반)")
public class SimulationFranchiseeEntity {

    @Id
    @Comment("프랜차이즈 아이디")
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

    @Comment("브랜드 이름")
    @Column(length = 100, nullable = false)
    private String brandName;

    @Comment("가입비 (천원)")
    @Column(nullable = false)
    private Integer subscription;

    @Comment("교육비 (천원)")
    @Column(nullable = false)
    private Integer education;

    @Comment("가맹 보증금 (천원)")
    @Column(nullable = false)
    private Integer deposit;

    @Comment("기타 비용 (천원)")
    @Column(nullable = false)
    private Integer etc;

    @Comment("부담금 합계 (천원)")
    @Column(nullable = false)
    private Integer totalLevy;

    @Comment("단위면적(3.3㎡)당 인테리어 비용 (천원)")
    @Column(nullable = false)
    private Integer unitArea;

    @Comment("인테리어 비용 (천원)")
    @Column(nullable = false)
    private Integer interior;

    @Comment("기준 점포 면적 (㎡)")
    @Column(nullable = false)
    private Integer area;
}
