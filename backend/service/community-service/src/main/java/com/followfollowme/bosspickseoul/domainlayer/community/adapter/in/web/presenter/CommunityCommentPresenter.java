package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityCommentItem;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityCommentLikeResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityCommentsResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityReplyItem;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class CommunityCommentPresenter {

    public CommunityCommentsResponse toCommentsResponse(List<CommunityComment> comments) {
        // 대댓글을 부모 댓글 ID별로 그룹화
        Map<Long, List<CommunityComment>> repliesByParent = comments.stream()
            .filter(c -> c.parentCommentId() != null)
            .collect(Collectors.groupingBy(CommunityComment::parentCommentId));

        // 최상위 댓글만 CommunityCommentItem으로 변환 (대댓글 포함)
        List<CommunityCommentItem> topLevelItems = comments.stream()
            .filter(c -> c.parentCommentId() == null)
            .map(c -> toCommentItem(c, repliesByParent.getOrDefault(c.id(), List.of())))
            .toList();

        return CommunityCommentsResponse.builder()
            .comments(topLevelItems)
            .build();
    }

    public CommunityCommentLikeResponse toCommentLikeResponse(long commentId, boolean liked, long likeCount) {
        return CommunityCommentLikeResponse.builder()
            .commentId(commentId)
            .liked(liked)
            .likeCount(likeCount)
            .build();
    }

    private CommunityCommentItem toCommentItem(CommunityComment comment, List<CommunityComment> replies) {
        return CommunityCommentItem.builder()
            .commentId(comment.id())
            .postId(comment.postId())
            .memberId(comment.memberId())
            .content(comment.content())
            .likeCount(comment.likeCount())
            .createdAt(comment.createdAt())
            .updatedAt(comment.updatedAt())
            .replies(replies.stream().map(this::toReplyItem).toList())
            .build();
    }

    private CommunityReplyItem toReplyItem(CommunityComment comment) {
        return CommunityReplyItem.builder()
            .commentId(comment.id())
            .postId(comment.postId())
            .memberId(comment.memberId())
            .parentCommentId(comment.parentCommentId())
            .content(comment.content())
            .likeCount(comment.likeCount())
            .createdAt(comment.createdAt())
            .updatedAt(comment.updatedAt())
            .build();
    }
}
