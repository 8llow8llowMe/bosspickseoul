package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
    name = "community_report",
    indexes = {
        @Index(name = "idx_community_report_target", columnList = "targetKind,targetId"),
        @Index(name = "idx_community_report_reporter", columnList = "reporterMemberId")
    }
)
@Comment("커뮤니티 신고")
public class CommunityReportEntity {

    @Id
    @Comment("신고 아이디")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("신고 대상 타입")
    private CommunityReportTargetKind targetKind;

    @Column(nullable = false)
    @Comment("신고 대상 아이디")
    private long targetId;

    @Column(nullable = false)
    @Comment("신고한 회원 아이디")
    private long reporterMemberId;

    @Column(nullable = false, length = 500)
    @Comment("신고 사유")
    private String reason;

    @Column(nullable = false)
    @Comment("신고 생성 시각")
    private LocalDateTime createdAt;
}
