package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.entity;

import com.followfollowme.nowdoboss.domainlayer.simulation.domain.enums.SimulationFloorType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
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
    name = "simulation_history",
    // 회원별 저장 목록을 최신순으로 조회한다.
    indexes = {
        @Index(name = "idx_simulation_history_member_id_created_at", columnList = "memberId, createdAt")
    })
@Comment("회원별 창업 시뮬레이션 저장 이력")
public class SimulationHistoryEntity {

    @Id
    @Comment("시뮬레이션 이력 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("회원 아이디 (FK: member.id)")
    @Column(nullable = false)
    private Long memberId;

    @Comment("프랜차이즈 창업 여부")
    @Column(nullable = false)
    private Boolean franchisee;

    @Comment("프랜차이즈 브랜드 이름 (비프랜차이즈면 null)")
    @Column(length = 100)
    private String brandName;

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
    @Column(length = 30, nullable = false)
    private String serviceName;

    @Comment("매장 면적 (㎡)")
    @Column(nullable = false)
    private Integer storeSize;

    @Comment("층 구분")
    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private SimulationFloorType floorType;

    @Comment("총 창업 비용 (만원)")
    @Column(nullable = false)
    private Long totalPrice;

    @Comment("저장 시각")
    @Column(nullable = false)
    private LocalDateTime createdAt;
}
