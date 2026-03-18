package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityReportEntity;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.CommunityReportRepository;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityReportPort;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.nowdoboss.persistence.util.SnowflakeIdGenerator;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityReportPersistenceAdapter implements CommunityReportPort {

    private final CommunityReportRepository communityReportRepository;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    @Override
    public boolean exists(CommunityReportTargetKind targetKind, long targetId, long reporterMemberId) {
        return communityReportRepository.existsByTargetKindAndTargetIdAndReporterMemberId(targetKind, targetId, reporterMemberId);
    }

    @Override
    public void save(CommunityReportTargetKind targetKind, long targetId, long reporterMemberId, String reason) {
        communityReportRepository.save(CommunityReportEntity.builder()
            .id(snowflakeIdGenerator.nextId())
            .targetKind(targetKind)
            .targetId(targetId)
            .reporterMemberId(reporterMemberId)
            .reason(reason)
            .createdAt(LocalDateTime.now())
            .build());
    }
}
