package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.common.util.ResponseId;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityCommentItem;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityCommentLikeResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityCommentsResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityReplyItem;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.MemberSummariesQueryResult.MemberSummaryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class CommunityCommentPresenter {

    public CommunityCommentsResponse toCommentsResponse(
        List<CommunityComment> comments, Map<Long, MemberSummaryQueryResult> writerSummaries
    ) {
        // 대댓글을 부모 댓글 ID별로 그룹화
        Map<Long, List<CommunityComment>> repliesByParent = comments.stream()
            .filter(c -> c.parentCommentId() != null)
            .collect(Collectors.groupingBy(CommunityComment::parentCommentId));

        // 최상위 댓글만 CommunityCommentItem으로 변환 (대댓글 포함)
        List<CommunityCommentItem> topLevelItems = comments.stream()
            .filter(c -> c.parentCommentId() == null)
            .map(c -> toCommentItem(c, repliesByParent.getOrDefault(c.id(), List.of()), writerSummaries))
            .toList();

        return CommunityCommentsResponse.builder()
            .comments(topLevelItems)
            .build();
    }

    public CommunityCommentLikeResponse toCommentLikeResponse(long commentId, boolean liked, long likeCount) {
        return CommunityCommentLikeResponse.builder()
            .commentId(ResponseId.of(commentId))
            .liked(liked)
            .likeCount(likeCount)
            .build();
    }

    private CommunityCommentItem toCommentItem(
        CommunityComment comment, List<CommunityComment> replies, Map<Long, MemberSummaryQueryResult> writerSummaries
    ) {
        return CommunityCommentItem.builder()
            .commentId(ResponseId.of(comment.id()))
            .postId(ResponseId.of(comment.postId()))
            .memberId(ResponseId.of(comment.memberId()))
            .writerNickname(writerNickname(writerSummaries, comment.memberId()))
            .writerProfileImageUrl(writerProfileImageUrl(writerSummaries, comment.memberId()))
            .content(comment.content())
            .likeCount(comment.likeCount())
            .createdAt(comment.createdAt())
            .updatedAt(comment.updatedAt())
            .replies(replies.stream().map(reply -> toReplyItem(reply, writerSummaries)).toList())
            .build();
    }

    private CommunityReplyItem toReplyItem(CommunityComment comment, Map<Long, MemberSummaryQueryResult> writerSummaries) {
        return CommunityReplyItem.builder()
            .commentId(ResponseId.of(comment.id()))
            .postId(ResponseId.of(comment.postId()))
            .memberId(ResponseId.of(comment.memberId()))
            .writerNickname(writerNickname(writerSummaries, comment.memberId()))
            .writerProfileImageUrl(writerProfileImageUrl(writerSummaries, comment.memberId()))
            .parentCommentId(ResponseId.of(comment.parentCommentId()))
            .content(comment.content())
            .likeCount(comment.likeCount())
            .createdAt(comment.createdAt())
            .updatedAt(comment.updatedAt())
            .build();
    }

    /** 작성자 요약이 없으면(미존재 회원, auth 장애 강등) null — 프론트가 대체 문구를 쓴다. */
    private String writerNickname(Map<Long, MemberSummaryQueryResult> writerSummaries, long memberId) {
        MemberSummaryQueryResult summary = writerSummaries.get(memberId);
        return summary == null ? null : summary.nickname();
    }

    private String writerProfileImageUrl(Map<Long, MemberSummaryQueryResult> writerSummaries, long memberId) {
        MemberSummaryQueryResult summary = writerSummaries.get(memberId);
        return summary == null ? null : summary.profileImageUrl();
    }
}
