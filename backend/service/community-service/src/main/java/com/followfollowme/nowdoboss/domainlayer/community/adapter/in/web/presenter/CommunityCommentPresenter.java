package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityCommentItem;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityCommentLikeResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityCommentsResponse;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityComment;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CommunityCommentPresenter {

    public CommunityCommentsResponse toCommentsResponse(List<CommunityComment> comments) {
        return CommunityCommentsResponse.builder()
            .comments(comments.stream().map(this::toCommentItem).toList())
            .build();
    }

    public CommunityCommentLikeResponse toCommentLikeResponse(long commentId, boolean liked, long likeCount) {
        return CommunityCommentLikeResponse.builder()
            .commentId(commentId)
            .liked(liked)
            .likeCount(likeCount)
            .build();
    }

    private CommunityCommentItem toCommentItem(CommunityComment comment) {
        return CommunityCommentItem.builder()
            .commentId(comment.id())
            .postId(comment.postId())
            .memberId(comment.memberId())
            .content(comment.content())
            .likeCount(comment.likeCount())
            .createdAt(comment.createdAt())
            .updatedAt(comment.updatedAt())
            .build();
    }
}
