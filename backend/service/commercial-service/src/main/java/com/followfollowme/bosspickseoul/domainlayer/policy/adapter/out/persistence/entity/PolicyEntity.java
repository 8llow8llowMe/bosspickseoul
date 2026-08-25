package com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.entity;

import com.followfollowme.bosspickseoul.domainlayer.policy.domain.enums.PolicySupportType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDate;
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
    name = "policy",
    // 추천 조회가 (마감일, 자치구, 업종) 조건으로 스캔한다. 마감일을 선두에 둔 이유는
    // 종료 정책을 먼저 걸러내는 것이 선택도가 가장 높기 때문이다.
    indexes = {
        @Index(name = "idx_policy_apply_end_at_district_code_service_category_code",
            columnList = "applyEndAt,districtCode,serviceCategoryCode")
    }
)
@Comment("소상공인 지원 정책")
public class PolicyEntity {

    @Id
    @Comment("정책 아이디")
    private Long id;

    @Column(nullable = false, length = 200)
    @Comment("정책명")
    private String title;

    @Column(nullable = false, length = 100)
    @Comment("지원 기관")
    private String organization;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("지원 유형 (FUNDING/SUBSIDY/EDUCATION/FACILITY/MARKETING)")
    private PolicySupportType supportType;

    @Column(nullable = false, length = 300)
    @Comment("지원 대상 요약")
    private String targetSummary;

    @Column(nullable = false, length = 500)
    @Comment("지원 내용")
    private String supportContent;

    @Column(length = 10)
    @Comment("지원 대상 자치구 코드 (NULL 이면 서울 전역/전국)")
    private String districtCode;

    @Column(length = 10)
    @Comment("지원 대상 업종 대분류 접두어 (NULL 이면 전업종)")
    private String serviceCategoryCode;

    @Column
    @Comment("신청 시작일 (NULL 이면 제한 없음)")
    private LocalDate applyStartAt;

    @Column
    @Comment("신청 마감일 (NULL 이면 상시 모집)")
    private LocalDate applyEndAt;

    @Column(nullable = false, length = 500)
    @Comment("상세 안내 URL")
    private String detailUrl;
}
