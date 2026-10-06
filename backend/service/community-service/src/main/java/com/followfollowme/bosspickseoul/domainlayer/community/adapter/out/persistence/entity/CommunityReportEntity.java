package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportReasonCode;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
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
        // 중복 신고는 exists 검사로 막지만, 동시 요청은 둘 다 검사를 통과할 수 있다.
        // 마지막 방어선을 DB 에 두고 위반은 핸들러가 DUPLICATE_REPORT(409) 로 변환한다.
        @Index(name = "uk_community_report_target_kind_target_id_reporter_member_id",
            columnList = "targetKind,targetId,reporterMemberId", unique = true),
        @Index(name = "idx_community_report_target_kind_target_id",
            columnList = "targetKind,targetId"),
        @Index(name = "idx_community_report_reporter_member_id",
            columnList = "reporterMemberId"),
        // 모더레이션 목록은 PENDING 만 읽는다(사유 코드 필터 포함). PENDING 은 처리되면 빠지는 작은 집합이라
        // (status, reasonCode) 인덱스 없이 이 인덱스로 거른 뒤 reasonCode 는 잔여 조건으로 본다(#473).
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

    // 사유 코드(#473) 이전 컬럼. NOT NULL 이 남아 있어(ddl-auto 는 컬럼을 지우지 않는다) 계속 채운다 — 레거시 요청은 받은 reason,
    // 신규 요청은 detail 이 있으면 detail, 없으면 사유 코드 표시명. 읽기는 reasonCode·detail 로 한다.
    @Column(nullable = false, length = 500)
    @Comment("레거시 신고 사유 원문 (deprecated — 후속 정리 대상. 사유는 reason_code·detail 로 읽는다)")
    private String reason;

    // 기존 행은 ddl-auto(dev)·런북(prod)의 DEFAULT 'ETC' 로 채워진다. 접두 문자열 백필은
    // scripts/migration/community-report-reason-code-runbook.sql 3절.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "varchar(20) default 'ETC'")
    @Comment("신고 사유 코드 (SPAM/ABUSE/PRIVACY/FALSE_INFO/ETC)")
    private CommunityReportReasonCode reasonCode;

    @Column(length = 500)
    @Comment("신고 상세 내용 (없으면 null)")
    private String detail;

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
