package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository.CommunityReportRepository;
import com.followfollowme.bosspickseoul.domainlayer.community.application.mapper.CommunityReactionMapper;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityReportRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityReport;
import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityReportRepositoryAdapter implements CommunityReportRepositoryPort {

    private final CommunityReportRepository communityReportRepository;
    private final CommunityReactionMapper communityReactionMapper;

    @Override
    public boolean exists(CommunityReportTargetKind targetKind, long targetId, long reporterMemberId) {
        return communityReportRepository.existsByTargetKindAndTargetIdAndReporterMemberId(targetKind, targetId, reporterMemberId);
    }

    @Override
    public CommunityReport save(CommunityReport report) {
        return communityReactionMapper.toDomainFromEntity(
            communityReportRepository.save(communityReactionMapper.toEntityFromDomain(report))
        );
    }

    @Override
    public List<CommunityReport> findPendingReports() {
        return communityReportRepository.findByStatusOrderByCreatedAtAsc(ReportStatus.PENDING)
            .stream()
            .map(communityReactionMapper::toDomainFromEntity)
            .toList();
    }

    @Override
    public Optional<CommunityReport> findById(long reportId) {
        return communityReportRepository.findById(reportId)
            .map(communityReactionMapper::toDomainFromEntity);
    }

    @Override
    public boolean resolvePending(
        long reportId, ReportStatus status, long resolvedByMemberId, LocalDateTime resolvedAt
    ) {
        return communityReportRepository.resolvePending(
            reportId, ReportStatus.PENDING, status, resolvedByMemberId, resolvedAt) == 1;
    }
}
