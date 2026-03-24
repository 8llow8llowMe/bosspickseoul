package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.CommunityReportRepository;
import com.followfollowme.nowdoboss.domainlayer.community.application.mapper.CommunityReactionMapper;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityReportPort;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityReport;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityReportPersistenceAdapter implements CommunityReportPort {

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
}
