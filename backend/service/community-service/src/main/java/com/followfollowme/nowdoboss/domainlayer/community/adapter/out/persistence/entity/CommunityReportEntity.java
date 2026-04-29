package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.ReportStatus;
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
        @Index(name = "idx_community_report_target_kind_target_id",
            columnList = "targetKind,targetId"),
        @Index(name = "idx_community_report_reporter_member_id",
            columnList = "reporterMemberId"),
        @Index(name = "idx_community_report_status",
            columnList = "status")
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
    @Comment("신고 대상 아이디 (FK: community_post.id 또는 community_comment.id, targetKind 에 따라 분기)")
    private Long targetId;

    @Column(nullable = false)
    @Comment("신고한 회원 아이디 (FK: member.id)")
    private Long reporterMemberId;

    @Column(nullable = false, length = 500)
    @Comment("신고 사유")
    private String reason;

    @Column(nullable = false)
    @Comment("신고 생성 시각")
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "varchar(20) default 'PENDING'")
    @Comment("신고 처리 상태")
    private ReportStatus status;

    @Column
    @Comment("신고 처리 시각")
    private LocalDateTime resolvedAt;

    @Column
    @Comment("처리한 매니저 회원 아이디 (FK: member.id, 미처리 상태에서는 null)")
    private Long resolvedByMemberId;
}
