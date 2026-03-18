package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.item.CommunityBoardTargetItem;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostItem;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostsResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostLikeResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostListResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostSummaryItem;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityTargetMeta;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.LikedCommunityPost;
import com.followfollowme.nowdoboss.persistence.dto.SliceResponse;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Component;

@Component
public class CommunityPostPresenter {

    private static final int PREVIEW_CONTENT_LENGTH = 120;

    public CommunityPostListResponse toPostListResponse(CommunityTargetMeta targetMeta, Slice<CommunityPost> posts) {
        CommunityBoardTargetItem board = (targetMeta != null)
            ? CommunityBoardTargetItem.builder()
                .targetType(targetMeta.targetType().name())
                .targetCode(targetMeta.targetCode())
                .targetName(targetMeta.targetName())
                .build()
            : null;

        return CommunityPostListResponse.builder()
            .board(board)
            .posts(SliceResponse.of(posts.map(this::toPostSummaryItem)))
            .build();
    }

    public CommunityLikedPostsResponse toLikedPostsResponse(Slice<LikedCommunityPost> posts) {
        return CommunityLikedPostsResponse.builder()
            .posts(SliceResponse.of(posts.map(this::toLikedPostItem)))
            .build();
    }

    public CommunityPostDetailResponse toPostDetailResponse(CommunityPost post) {
        return CommunityPostDetailResponse.builder()
            .postId(post.id())
            .memberId(post.memberId())
            .targetType(post.targetType().name())
            .targetCode(post.targetCode())
            .targetName(post.targetName())
            .title(post.title())
            .content(post.content())
            .likeCount(post.likeCount())
            .commentCount(post.commentCount())
            .createdAt(post.createdAt())
            .updatedAt(post.updatedAt())
            .build();
    }

    public CommunityPostLikeResponse toPostLikeResponse(long postId, boolean liked, long likeCount) {
        return CommunityPostLikeResponse.builder()
            .postId(postId)
            .liked(liked)
            .likeCount(likeCount)
            .build();
    }

    private CommunityPostSummaryItem toPostSummaryItem(CommunityPost post) {
        return CommunityPostSummaryItem.builder()
            .postId(post.id())
            .memberId(post.memberId())
            .targetType(post.targetType().name())
            .targetCode(post.targetCode())
            .targetName(post.targetName())
            .title(post.title())
            .previewContent(truncateContent(post.content()))
            .likeCount(post.likeCount())
            .commentCount(post.commentCount())
            .createdAt(post.createdAt())
            .build();
    }

    private CommunityLikedPostItem toLikedPostItem(LikedCommunityPost likedPost) {
        CommunityPost post = likedPost.post();
        return CommunityLikedPostItem.builder()
            .postId(post.id())
            .memberId(post.memberId())
            .targetType(post.targetType().name())
            .targetCode(post.targetCode())
            .targetName(post.targetName())
            .title(post.title())
            .previewContent(truncateContent(post.content()))
            .likeCount(post.likeCount())
            .commentCount(post.commentCount())
            .createdAt(post.createdAt())
            .likedAt(likedPost.likedAt())
            .build();
    }

    private String truncateContent(String content) {
        return content.length() > PREVIEW_CONTENT_LENGTH
            ? content.substring(0, PREVIEW_CONTENT_LENGTH) + "..."
            : content;
    }
}
