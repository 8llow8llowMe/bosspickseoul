package com.followfollowme.nowdoboss.domainlayer.community.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityReportRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityComment;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityReport;
import java.util.List;
import java.util.Optional;
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

    public Optional<CommunityPost> findPostById(long postId) {
        return communityPostRepositoryPort.findById(postId);
    }

    public Optional<CommunityComment> findCommentById(long commentId) {
        return communityCommentRepositoryPort.findById(commentId);
    }
}
