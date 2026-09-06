package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityReportEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
import java.util.List;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommunityReportRepository extends JpaRepository<CommunityReportEntity, Long> {

    boolean existsByTargetKindAndTargetIdAndReporterMemberId(
        CommunityReportTargetKind targetKind,
        long targetId,
        long reporterMemberId
    );

    List<CommunityReportEntity> findByStatusOrderByCreatedAtAsc(ReportStatus status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update CommunityReportEntity r
           set r.status = :nextStatus, r.resolvedAt = :resolvedAt,
               r.resolvedByMemberId = :resolvedByMemberId
         where r.id = :reportId and r.status = :pendingStatus
        """)
    int resolvePending(
        @Param("reportId") long reportId,
        @Param("pendingStatus") ReportStatus pendingStatus,
        @Param("nextStatus") ReportStatus nextStatus,
        @Param("resolvedByMemberId") long resolvedByMemberId,
        @Param("resolvedAt") LocalDateTime resolvedAt
    );
}
