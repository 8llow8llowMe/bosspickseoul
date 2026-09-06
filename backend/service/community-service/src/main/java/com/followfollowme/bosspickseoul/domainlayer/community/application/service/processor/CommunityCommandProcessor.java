package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.community.application.command.CreateCommentCommand;
import com.followfollowme.bosspickseoul.domainlayer.community.application.command.CreatePostCommand;
import com.followfollowme.bosspickseoul.domainlayer.community.application.command.CreateReportCommand;
import com.followfollowme.bosspickseoul.domainlayer.community.application.command.UpdatePostCommand;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentLikeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostLikeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityReportRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityTargetMetaRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityCommentStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityCommentLike;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPostLike;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityReport;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityTargetMeta;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import com.followfollowme.bosspickseoul.domainlayer.community.application.info.CommunityLikeToggleResult;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class CommunityCommandProcessor {

    private final SnowflakeIdGenerator snowflakeIdGenerator;
    private final CommunityPostRepositoryPort communityPostRepositoryPort;
    private final CommunityCommentRepositoryPort communityCommentRepositoryPort;
    private final CommunityPostLikeRepositoryPort communityPostLikeRepositoryPort;
    private final CommunityCommentLikeRepositoryPort communityCommentLikeRepositoryPort;
    private final CommunityReportRepositoryPort communityReportRepositoryPort;
    private final CommunityTargetMetaRepositoryPort communityTargetMetaRepositoryPort;

    @Transactional
    public CommunityPost createPost(long memberId, CreatePostCommand command) {
        CommunityTargetType parsedTargetType = CommunityTargetType.from(command.targetType());
        CommunityTargetMeta targetMeta = communityTargetMetaRepositoryPort.findTargetMeta(parsedTargetType, command.targetCode())
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.TARGET_NOT_FOUND));

        LocalDateTime now = LocalDateTime.now();
        return communityPostRepositoryPort.save(new CommunityPost(
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
            0L,
            now,
            now
        ));
    }

    @Transactional
    public CommunityPost updatePost(long memberId, CommunityPost post, UpdatePostCommand command) {
        validatePostOwner(memberId, post);

        return communityPostRepositoryPort.updateContentIfActive(
                post.id(), memberId, command.title().trim(), command.content().trim(), LocalDateTime.now())
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.POST_NOT_FOUND));
    }

    @Transactional
    public void deletePost(long memberId, CommunityPost post) {
        validatePostOwner(memberId, post);

        communityPostRepositoryPort.deleteIfActive(post.id());
    }

    @Transactional
    public CommunityComment createComment(long memberId, CommunityPost post, CreateCommentCommand command) {
        Long parentCommentId = command.parentCommentId();
        if (parentCommentId != null) {
            validateParentComment(parentCommentId, post.id());
        }
        LocalDateTime now = LocalDateTime.now();
        CommunityComment comment = communityCommentRepositoryPort.save(new CommunityComment(
            snowflakeIdGenerator.generateId(),
            post.id(),
            memberId,
            parentCommentId,
            command.content().trim(),
            CommunityCommentStatus.ACTIVE,
            0L,
            now,
            now
        ));

        communityPostRepositoryPort.incrementCommentCountIfActive(post.id())
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.POST_NOT_FOUND));
        return comment;
    }

    @Transactional
    public void deleteComment(long memberId, CommunityComment comment) {
        if (comment.memberId() != memberId) {
            throw new CommunityException(CommunityErrorCode.FORBIDDEN_COMMENT_ACCESS);
        }

        if (communityCommentRepositoryPort.deleteIfActive(comment.id())) {
            communityPostRepositoryPort.decrementCommentCountIfActive(comment.postId());
        }
    }

    @Transactional
    public CommunityLikeToggleResult togglePostLike(long memberId, CommunityPost post) {
        boolean exists = communityPostLikeRepositoryPort.exists(post.id(), memberId);
        long nextLikeCount;

        if (exists) {
            if (!communityPostLikeRepositoryPort.delete(post.id(), memberId)) {
                throw new CommunityException(CommunityErrorCode.CONCURRENT_REACTION);
            }
            nextLikeCount = communityPostRepositoryPort.decrementLikeCountIfActive(post.id())
                .orElseThrow(() -> new CommunityException(CommunityErrorCode.POST_NOT_FOUND));
        } else {
            communityPostLikeRepositoryPort.save(new CommunityPostLike(
                snowflakeIdGenerator.generateId(),
                post.id(),
                memberId,
                LocalDateTime.now()
            ));
            nextLikeCount = communityPostRepositoryPort.incrementLikeCountIfActive(post.id())
                .orElseThrow(() -> new CommunityException(CommunityErrorCode.POST_NOT_FOUND));
        }
        return new CommunityLikeToggleResult(!exists, nextLikeCount);
    }

    @Transactional
    public CommunityLikeToggleResult toggleCommentLike(long memberId, CommunityComment comment) {
        boolean exists = communityCommentLikeRepositoryPort.exists(comment.id(), memberId);
        long nextLikeCount;

        if (exists) {
            if (!communityCommentLikeRepositoryPort.delete(comment.id(), memberId)) {
                throw new CommunityException(CommunityErrorCode.CONCURRENT_REACTION);
            }
            nextLikeCount = communityCommentRepositoryPort.decrementLikeCountIfActive(comment.id())
                .orElseThrow(() -> new CommunityException(CommunityErrorCode.COMMENT_NOT_FOUND));
        } else {
            communityCommentLikeRepositoryPort.save(new CommunityCommentLike(
                snowflakeIdGenerator.generateId(),
                comment.id(),
                memberId,
                LocalDateTime.now()
            ));
            nextLikeCount = communityCommentRepositoryPort.incrementLikeCountIfActive(comment.id())
                .orElseThrow(() -> new CommunityException(CommunityErrorCode.COMMENT_NOT_FOUND));
        }
        return new CommunityLikeToggleResult(!exists, nextLikeCount);
    }

    @Transactional
    public void createReport(long memberId, CreateReportCommand command) {
        validateReportTarget(command.targetKind(), command.targetId());

        if (communityReportRepositoryPort.exists(command.targetKind(), command.targetId(), memberId)) {
            throw new CommunityException(CommunityErrorCode.DUPLICATE_REPORT);
        }

        communityReportRepositoryPort.save(new CommunityReport(
            snowflakeIdGenerator.generateId(),
            command.targetKind(),
            command.targetId(),
            memberId,
            command.reason().trim(),
            LocalDateTime.now(),
            ReportStatus.PENDING,
            null,
            null
        ));
    }

    private void validateParentComment(long parentCommentId, long postId) {
        CommunityComment parent = communityCommentRepositoryPort.findById(parentCommentId)
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.COMMENT_NOT_FOUND));
        if (parent.postId() != postId) {
            throw new CommunityException(CommunityErrorCode.COMMENT_NOT_FOUND);
        }
        if (parent.parentCommentId() != null) {
            throw new CommunityException(CommunityErrorCode.INVALID_TARGET_TYPE);
        }
        if (parent.status() != CommunityCommentStatus.ACTIVE) {
            throw new CommunityException(CommunityErrorCode.COMMENT_NOT_FOUND);
        }
    }

    private CommunityPost getPost(long postId) {
        return communityPostRepositoryPort.findById(postId)
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

        communityCommentRepositoryPort.findById(targetId)
            .filter(comment -> comment.status() == CommunityCommentStatus.ACTIVE)
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.COMMENT_NOT_FOUND));
    }

    @Transactional
    public CommunityPost incrementViewCount(CommunityPost post) {
        return communityPostRepositoryPort.incrementViewCountIfActive(post.id())
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.POST_NOT_FOUND));
    }
}
