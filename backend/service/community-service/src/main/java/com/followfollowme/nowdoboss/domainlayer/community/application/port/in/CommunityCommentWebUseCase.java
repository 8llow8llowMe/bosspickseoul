package com.followfollowme.nowdoboss.domainlayer.community.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityCommentCreateRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityCommentLikeResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityCommentsResponse;

public interface CommunityCommentWebUseCase {

    CommunityCommentsResponse getComments(long postId);

    CommunityCommentsResponse createComment(long memberId, long postId, CommunityCommentCreateRequest request);

    void deleteComment(long memberId, long postId, long commentId);

    CommunityCommentLikeResponse toggleCommentLike(long memberId, long postId, long commentId);
}
