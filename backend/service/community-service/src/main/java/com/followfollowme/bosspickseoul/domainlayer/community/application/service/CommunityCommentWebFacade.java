package com.followfollowme.bosspickseoul.domainlayer.community.application.service;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.CommunityCommentCreateRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityCommentLikeResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityCommentsResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.presenter.CommunityCommentPresenter;
import com.followfollowme.bosspickseoul.domainlayer.community.application.command.CreateCommentCommand;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.in.CommunityCommentWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityCommandProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.application.info.CommunityLikeToggleResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommunityCommentWebFacade implements CommunityCommentWebUseCase {

    private final CommunityQueryProcessor communityQueryProcessor;
    private final CommunityCommandProcessor communityCommandProcessor;
    private final CommunityCommentPresenter communityCommentPresenter;

    @Override
    @Transactional(readOnly = true)
    public CommunityCommentsResponse getComments(long postId) {
        return communityCommentPresenter.toCommentsResponse(communityQueryProcessor.getComments(postId));
    }

    @Override
    public CommunityCommentsResponse createComment(long memberId, long postId, CommunityCommentCreateRequest request) {
        // 1. 게시글 조회 및 댓글 생성
        CommunityPost post = communityQueryProcessor.getPost(postId);
        CreateCommentCommand command = new CreateCommentCommand(request.parentCommentId(), request.content());
        communityCommandProcessor.createComment(memberId, post, command);

        // 2. 전체 댓글 목록 반환
        return communityCommentPresenter.toCommentsResponse(communityQueryProcessor.getComments(postId));
    }

    @Override
    public void deleteComment(long memberId, long postId, long commentId) {
        // 1. 댓글 조회 및 게시글 소속 검증
        CommunityComment comment = communityQueryProcessor.getComment(commentId);
        validateCommentBelongsToPost(comment, postId);

        // 2. 댓글 삭제
        communityCommandProcessor.deleteComment(memberId, comment);
    }

    @Override
    public CommunityCommentLikeResponse toggleCommentLike(long memberId, long postId, long commentId) {
        // 1. 댓글 조회 및 게시글 소속 검증
        CommunityComment comment = communityQueryProcessor.getComment(commentId);
        validateCommentBelongsToPost(comment, postId);

        // 2. 좋아요 토글 및 응답 변환
        CommunityLikeToggleResult result = communityCommandProcessor.toggleCommentLike(memberId, comment);
        return communityCommentPresenter.toCommentLikeResponse(commentId, result.liked(), result.likeCount());
    }

    private void validateCommentBelongsToPost(CommunityComment comment, long postId) {
        if (comment.postId() != postId) {
            throw new CommunityException(CommunityErrorCode.COMMENT_NOT_FOUND);
        }
    }
}
