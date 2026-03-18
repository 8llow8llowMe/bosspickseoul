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
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPost;
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
        // 1. 대상 메타 조회
        CommunityTargetType parsedTargetType = CommunityTargetType.from(command.targetType());
        CommunityTargetMeta targetMeta = communityTargetMetaPort.findTargetMeta(parsedTargetType, command.targetCode())
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.TARGET_NOT_FOUND));

        // 2. 게시글 생성 및 저장
        LocalDateTime now = LocalDateTime.now();
        return communityPostPort.save(new CommunityPost(
            snowflakeIdGenerator.nextId(),
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
        // 1. 작성자 검증
        validatePostOwner(memberId, post);

        // 2. 게시글 수정 및 저장
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
        // 1. 작성자 검증
        validatePostOwner(memberId, post);

        // 2. 게시글 소프트 삭제
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
        // 1. 댓글 생성 및 저장
        LocalDateTime now = LocalDateTime.now();
        CommunityComment comment = communityCommentPort.save(new CommunityComment(
            snowflakeIdGenerator.nextId(),
            post.id(),
            memberId,
            command.content().trim(),
            CommunityCommentStatus.ACTIVE,
            0L,
            now,
            now
        ));

        // 2. 게시글 댓글 수 업데이트
        savePostWithCommentCount(post, post.commentCount() + 1);
        return comment;
    }

    @Transactional
    public void deleteComment(long memberId, CommunityComment comment) {
        // 1. 작성자 검증
        if (comment.memberId() != memberId) {
            throw new CommunityException(CommunityErrorCode.FORBIDDEN_COMMENT_ACCESS);
        }

        // 2. 게시글 댓글 수 업데이트
        CommunityPost post = getPost(comment.postId());
        savePostWithCommentCount(post, Math.max(0, post.commentCount() - 1));

        // 3. 댓글 소프트 삭제
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
        // 1. 좋아요 존재 여부 확인 및 토글
        boolean exists = communityPostLikePort.exists(post.id(), memberId);
        long nextLikeCount;

        if (exists) {
            communityPostLikePort.delete(post.id(), memberId);
            nextLikeCount = Math.max(0, post.likeCount() - 1);
        } else {
            communityPostLikePort.save(post.id(), memberId);
            nextLikeCount = post.likeCount() + 1;
        }

        // 2. 게시글 좋아요 수 업데이트
        savePostWithLikeCount(post, nextLikeCount);
        return nextLikeCount;
    }

    @Transactional
    public long toggleCommentLike(long memberId, CommunityComment comment) {
        // 1. 좋아요 존재 여부 확인 및 토글
        boolean exists = communityCommentLikePort.existsCommentLike(comment.id(), memberId);
        long nextLikeCount;

        if (exists) {
            communityCommentLikePort.deleteCommentLike(comment.id(), memberId);
            nextLikeCount = Math.max(0, comment.likeCount() - 1);
        } else {
            communityCommentLikePort.saveCommentLike(comment.id(), memberId);
            nextLikeCount = comment.likeCount() + 1;
        }

        // 2. 댓글 좋아요 수 업데이트
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
        // 1. 신고 대상 유효성 검증
        validateReportTarget(command.targetKind(), command.targetId());

        // 2. 중복 신고 검증
        if (communityReportPort.exists(command.targetKind(), command.targetId(), memberId)) {
            throw new CommunityException(CommunityErrorCode.DUPLICATE_REPORT);
        }

        // 3. 신고 저장
        communityReportPort.save(command.targetKind(), command.targetId(), memberId, command.reason().trim());
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
