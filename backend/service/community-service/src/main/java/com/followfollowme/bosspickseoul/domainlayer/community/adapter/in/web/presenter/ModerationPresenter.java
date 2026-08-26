package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.common.util.ResponseId;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.ModerationDecisionResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.ModerationReportItem;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.ModerationReportsResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ModerationDecision;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityReport;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ModerationPresenter {

    private static final int PREVIEW_MAX_LEN = 100;

    public ModerationReportsResponse toReportsResponse(
        List<CommunityReport> reports,
        Map<Long, CommunityPost> postsById,
        Map<Long, CommunityComment> commentsById
    ) {
        List<ModerationReportItem> items = reports.stream()
            .map(report -> toReportItem(report, postsById, commentsById))
            .toList();
        return ModerationReportsResponse.builder()
            .reports(items)
            .build();
    }

    public ModerationDecisionResponse toDecisionResponse(CommunityReport report, ModerationDecision decision) {
        return ModerationDecisionResponse.builder()
            .reportId(ResponseId.of(report.id()))
            .decision(decision)
            .status(report.status())
            .resolvedAt(report.resolvedAt())
            .build();
    }

    private ModerationReportItem toReportItem(
        CommunityReport report,
        Map<Long, CommunityPost> postsById,
        Map<Long, CommunityComment> commentsById
    ) {
        String targetTitle = null;
        String targetPreview = null;
        Long targetAuthorId = null;

        if (report.targetKind() == CommunityReportTargetKind.POST) {
            CommunityPost post = postsById.get(report.targetId());
            if (post != null) {
                targetTitle = post.title();
                targetPreview = truncate(post.content());
                targetAuthorId = post.memberId();
            }
        } else {
            CommunityComment comment = commentsById.get(report.targetId());
            if (comment != null) {
                targetPreview = truncate(comment.content());
                targetAuthorId = comment.memberId();
            }
        }

        return ModerationReportItem.builder()
            .reportId(ResponseId.of(report.id()))
            .targetKind(report.targetKind())
            .targetId(ResponseId.of(report.targetId()))
            .reporterMemberId(ResponseId.of(report.reporterMemberId()))
            .reason(report.reason())
            .status(report.status())
            .createdAt(report.createdAt())
            .targetTitle(targetTitle)
            .targetPreview(targetPreview)
            .targetAuthorId(ResponseId.of(targetAuthorId))
            .build();
    }

    private static String truncate(String text) {
        if (text == null) {
            return null;
        }
        return text.length() > PREVIEW_MAX_LEN ? text.substring(0, PREVIEW_MAX_LEN) : text;
    }
}
