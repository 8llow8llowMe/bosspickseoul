package com.followfollowme.nowdoboss.domainlayer.community.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.community.application.command.CreateCommentCommand;
import com.followfollowme.nowdoboss.domainlayer.community.application.command.CreatePostCommand;
import com.followfollowme.nowdoboss.domainlayer.community.application.command.CreateReportCommand;
import com.followfollowme.nowdoboss.domainlayer.community.application.command.UpdatePostCommand;
import com.followfollowme.nowdoboss.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.nowdoboss.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityCommentLikePort;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityCommentPort;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityPostLikePort;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityPostPort;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityReportPort;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityTargetMetaPort;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityCommentStatus;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityComment;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityCommentLike;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPostLike;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityReport;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityTargetMeta;
import com.followfollowme.nowdoboss.persistence.util.SnowflakeIdGenerator;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class CommunityCommandProcessor {

    private final SnowflakeIdGenerator snowflakeIdGenerator;
    private final CommunityPostPort communityPostPort;
    private final CommunityCommentPort communityCommentPort;
    private final CommunityPostLikePort communityPostLikePort;
    private final CommunityCommentLikePort communityCommentLikePort;
    private final CommunityReportPort communityReportPort;
    private final CommunityTargetMetaPort communityTargetMetaPort;

    @Transactional
    public CommunityPost createPost(long memberId, CreatePostCommand command) {
        CommunityTargetType parsedTargetType = CommunityTargetType.from(command.targetType());
        CommunityTargetMeta targetMeta = communityTargetMetaPort.findTargetMeta(parsedTargetType, command.targetCode())
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.TARGET_NOT_FOUND));

        LocalDateTime now = LocalDateTime.now();
        return communityPostPort.save(new CommunityPost(
            snowflakeIdGenerator.generateId(),
            memberId,
            targetMeta.targetType(),
            targetMeta.targetCode(),
            targetMeta.targetName(),
            command.title().trim(),
            command.content().trim(),
            CommunityPostStatus.ACTIVE,
            0L,
            0L,
            now,
            now
        ));
    }

    @Transactional
    public CommunityPost updatePost(long memberId, CommunityPost post, UpdatePostCommand command) {
        validatePostOwner(memberId, post);

        return communityPostPort.save(new CommunityPost(
            post.id(),
            post.memberId(),
            post.targetType(),
            post.targetCode(),
            post.targetName(),
            command.title().trim(),
            command.content().trim(),
            post.status(),
            post.likeCount(),
            post.commentCount(),
            post.createdAt(),
            LocalDateTime.now()
        ));
    }

    @Transactional
    public void deletePost(long memberId, CommunityPost post) {
        validatePostOwner(memberId, post);

        communityPostPort.save(new CommunityPost(
            post.id(),
            post.memberId(),
            post.targetType(),
            post.targetCode(),
            post.targetName(),
            post.title(),
            post.content(),
            CommunityPostStatus.DELETED,
            post.likeCount(),
            post.commentCount(),
            post.createdAt(),
            LocalDateTime.now()
        ));
    }

    @Transactional
    public CommunityComment createComment(long memberId, CommunityPost post, CreateCommentCommand command) {
        LocalDateTime now = LocalDateTime.now();
        CommunityComment comment = communityCommentPort.save(new CommunityComment(
            snowflakeIdGenerator.generateId(),
            post.id(),
            memberId,
            command.content().trim(),
            CommunityCommentStatus.ACTIVE,
            0L,
            now,
            now
        ));

        savePostWithCommentCount(post, post.commentCount() + 1);
        return comment;
    }

    @Transactional
    public void deleteComment(long memberId, CommunityComment comment) {
        if (comment.memberId() != memberId) {
            throw new CommunityException(CommunityErrorCode.FORBIDDEN_COMMENT_ACCESS);
        }

        CommunityPost post = getPost(comment.postId());
        savePostWithCommentCount(post, Math.max(0, post.commentCount() - 1));

        communityCommentPort.save(new CommunityComment(
            comment.id(),
            comment.postId(),
            comment.memberId(),
            comment.content(),
            CommunityCommentStatus.DELETED,
            comment.likeCount(),
            comment.createdAt(),
            LocalDateTime.now()
        ));
    }

    @Transactional
    public long togglePostLike(long memberId, CommunityPost post) {
        boolean exists = communityPostLikePort.exists(post.id(), memberId);
        long nextLikeCount;

        if (exists) {
            communityPostLikePort.delete(post.id(), memberId);
            nextLikeCount = Math.max(0, post.likeCount() - 1);
        } else {
            communityPostLikePort.save(new CommunityPostLike(
                snowflakeIdGenerator.generateId(),
                post.id(),
                memberId,
                LocalDateTime.now()
            ));
            nextLikeCount = post.likeCount() + 1;
        }

        savePostWithLikeCount(post, nextLikeCount);
        return nextLikeCount;
    }

    @Transactional
    public long toggleCommentLike(long memberId, CommunityComment comment) {
        boolean exists = communityCommentLikePort.exists(comment.id(), memberId);
        long nextLikeCount;

        if (exists) {
            communityCommentLikePort.delete(comment.id(), memberId);
            nextLikeCount = Math.max(0, comment.likeCount() - 1);
        } else {
            communityCommentLikePort.save(new CommunityCommentLike(
                snowflakeIdGenerator.generateId(),
                comment.id(),
                memberId,
                LocalDateTime.now()
            ));
            nextLikeCount = comment.likeCount() + 1;
        }

        communityCommentPort.save(new CommunityComment(
            comment.id(),
            comment.postId(),
            comment.memberId(),
            comment.content(),
            comment.status(),
            nextLikeCount,
            comment.createdAt(),
            LocalDateTime.now()
        ));

        return nextLikeCount;
    }

    @Transactional
    public void createReport(long memberId, CreateReportCommand command) {
        validateReportTarget(command.targetKind(), command.targetId());

        if (communityReportPort.exists(command.targetKind(), command.targetId(), memberId)) {
            throw new CommunityException(CommunityErrorCode.DUPLICATE_REPORT);
        }

        communityReportPort.save(new CommunityReport(
            snowflakeIdGenerator.generateId(),
            command.targetKind(),
            command.targetId(),
            memberId,
            command.reason().trim(),
            LocalDateTime.now()
        ));
    }

    private CommunityPost getPost(long postId) {
        return communityPostPort.findById(postId)
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.POST_NOT_FOUND));
    }

    private void validatePostOwner(long memberId, CommunityPost post) {
        if (post.memberId() != memberId) {
            throw new CommunityException(CommunityErrorCode.FORBIDDEN_POST_ACCESS);
        }
    }

    private void validateReportTarget(CommunityReportTargetKind targetKind, long targetId) {
        if (targetKind == CommunityReportTargetKind.POST) {
            getPost(targetId);
            return;
        }

        communityCommentPort.findById(targetId)
            .filter(comment -> comment.status() == CommunityCommentStatus.ACTIVE)
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.COMMENT_NOT_FOUND));
    }

    private void savePostWithLikeCount(CommunityPost post, long likeCount) {
        communityPostPort.save(new CommunityPost(
            post.id(),
            post.memberId(),
            post.targetType(),
            post.targetCode(),
            post.targetName(),
            post.title(),
            post.content(),
            post.status(),
            likeCount,
            post.commentCount(),
            post.createdAt(),
            LocalDateTime.now()
        ));
    }

    private void savePostWithCommentCount(CommunityPost post, long commentCount) {
        communityPostPort.save(new CommunityPost(
            post.id(),
            post.memberId(),
            post.targetType(),
            post.targetCode(),
            post.targetName(),
            post.title(),
            post.content(),
            post.status(),
            post.likeCount(),
            commentCount,
            post.createdAt(),
            LocalDateTime.now()
        ));
    }
}
