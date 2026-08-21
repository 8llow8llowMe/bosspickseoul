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

        return communityPostRepositoryPort.save(new CommunityPost(
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
            post.viewCount(),
            post.createdAt(),
            LocalDateTime.now()
        ));
    }

    @Transactional
    public void deletePost(long memberId, CommunityPost post) {
        validatePostOwner(memberId, post);

        communityPostRepositoryPort.save(new CommunityPost(
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
            post.viewCount(),
            post.createdAt(),
            LocalDateTime.now()
        ));
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

        communityCommentRepositoryPort.save(new CommunityComment(
            comment.id(),
            comment.postId(),
            comment.memberId(),
            comment.parentCommentId(),
            comment.content(),
            CommunityCommentStatus.DELETED,
            comment.likeCount(),
            comment.createdAt(),
            LocalDateTime.now()
        ));
    }

    @Transactional
    public long togglePostLike(long memberId, CommunityPost post) {
        boolean exists = communityPostLikeRepositoryPort.exists(post.id(), memberId);
        long nextLikeCount;

        if (exists) {
            communityPostLikeRepositoryPort.delete(post.id(), memberId);
            nextLikeCount = Math.max(0, post.likeCount() - 1);
        } else {
            communityPostLikeRepositoryPort.save(new CommunityPostLike(
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
        boolean exists = communityCommentLikeRepositoryPort.exists(comment.id(), memberId);
        long nextLikeCount;

        if (exists) {
            communityCommentLikeRepositoryPort.delete(comment.id(), memberId);
            nextLikeCount = Math.max(0, comment.likeCount() - 1);
        } else {
            communityCommentLikeRepositoryPort.save(new CommunityCommentLike(
                snowflakeIdGenerator.generateId(),
                comment.id(),
                memberId,
                LocalDateTime.now()
            ));
            nextLikeCount = comment.likeCount() + 1;
        }

        communityCommentRepositoryPort.save(new CommunityComment(
            comment.id(),
            comment.postId(),
            comment.memberId(),
            comment.parentCommentId(),
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
        return communityPostRepositoryPort.save(new CommunityPost(
            post.id(),
            post.memberId(),
            post.targetType(),
            post.targetCode(),
            post.targetName(),
            post.title(),
            post.content(),
            post.status(),
            post.likeCount(),
            post.commentCount(),
            post.viewCount() + 1,
            post.createdAt(),
            post.updatedAt()
        ));
    }

    private void savePostWithLikeCount(CommunityPost post, long likeCount) {
        communityPostRepositoryPort.save(new CommunityPost(
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
            post.viewCount(),
            post.createdAt(),
            LocalDateTime.now()
        ));
    }

    private void savePostWithCommentCount(CommunityPost post, long commentCount) {
        communityPostRepositoryPort.save(new CommunityPost(
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
            post.viewCount(),
            post.createdAt(),
            LocalDateTime.now()
        ));
    }
}
