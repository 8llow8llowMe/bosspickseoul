package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.community.application.model.ModerationReportTargets;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityReportRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityReport;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ModerationQueryProcessor {

    private final CommunityReportRepositoryPort communityReportRepositoryPort;
    private final CommunityPostRepositoryPort communityPostRepositoryPort;
    private final CommunityCommentRepositoryPort communityCommentRepositoryPort;

    public List<CommunityReport> findPendingReports() {
        return communityReportRepositoryPort.findPendingReports();
    }

    /**
     * 신고 목록에 붙일 대상 컨텐츠를 <b>종류별 in 절 2번</b>으로 모아 온다.
     *
     * <p>신고를 순회하며 건당 단건 조회를 부르면 신고 수만큼 왕복이 생긴다(N+1).
     * 대상 종류가 게시글/댓글 둘뿐이므로 아이디를 종류별로 모아 두 번만 질의한다.
     */
    public ModerationReportTargets findReportTargets(List<CommunityReport> reports) {
        if (reports.isEmpty()) {
            return ModerationReportTargets.empty();
        }

        Set<Long> postIds = targetIdsOf(reports, CommunityReportTargetKind.POST);
        Set<Long> commentIds = targetIdsOf(reports, CommunityReportTargetKind.COMMENT);

        Map<Long, CommunityPost> postsById = communityPostRepositoryPort.findAllByIds(postIds).stream()
            .collect(Collectors.toMap(CommunityPost::id, Function.identity()));
        Map<Long, CommunityComment> commentsById = communityCommentRepositoryPort.findAllByIds(commentIds).stream()
            .collect(Collectors.toMap(CommunityComment::id, Function.identity()));

        return new ModerationReportTargets(postsById, commentsById);
    }

    private Set<Long> targetIdsOf(List<CommunityReport> reports, CommunityReportTargetKind kind) {
        return reports.stream()
            .filter(report -> report.targetKind() == kind)
            .map(CommunityReport::targetId)
            .collect(Collectors.toSet());
    }
}
