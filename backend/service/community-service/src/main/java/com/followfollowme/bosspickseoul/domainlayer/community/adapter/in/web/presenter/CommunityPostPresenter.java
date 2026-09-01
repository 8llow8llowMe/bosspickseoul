package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.common.util.ResponseId;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.item.CommunityBoardTargetItem;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityCommercialComparisonDraftResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostItem;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostsResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostLikeResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostListResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostSummaryItem;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityCommercialComparisonDraftInfo;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.item.CommunityPostImageItem;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPostImage;
import com.followfollowme.bosspickseoul.storage.client.ObjectStorageClient;
import java.util.List;
import java.util.function.Function;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityTargetMeta;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.LikedCommunityPost;
import com.followfollowme.bosspickseoul.persistence.dto.SliceResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.SliceQueryResult;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityPostPresenter {

    private final ObjectStorageClient objectStorageClient;

    private static final int PREVIEW_CONTENT_LENGTH = 120;

    public CommunityPostListResponse toPostListResponse(
        CommunityTargetMeta targetMeta, SliceQueryResult<CommunityPost> posts, Map<Long, List<CommunityPostImage>> imagesByPostId
    ) {
        CommunityBoardTargetItem board = (targetMeta != null)
            ? CommunityBoardTargetItem.builder()
                .targetType(targetMeta.targetType().toMetadata())
                .targetCode(targetMeta.targetCode())
                .targetName(targetMeta.targetName())
                .build()
            : null;

        return CommunityPostListResponse.builder()
            .board(board)
            .posts(toSliceResponse(posts, post -> toPostSummaryItem(post, imagesByPostId)))
            .build();
    }

    public CommunityLikedPostsResponse toLikedPostsResponse(SliceQueryResult<LikedCommunityPost> posts) {
        return CommunityLikedPostsResponse.builder()
            .posts(toSliceResponse(posts, this::toLikedPostItem))
            .build();
    }

    public CommunityPostDetailResponse toPostDetailResponse(CommunityPost post, List<CommunityPostImage> images) {
        return CommunityPostDetailResponse.builder()
            .images(toImageItems(images))
            .postId(ResponseId.of(post.id()))
            .memberId(ResponseId.of(post.memberId()))
            .targetType(post.targetType().toMetadata())
            .targetCode(post.targetCode())
            .targetName(post.targetName())
            .title(post.title())
            .content(post.content())
            .likeCount(post.likeCount())
            .commentCount(post.commentCount())
            .viewCount(post.viewCount())
            .createdAt(post.createdAt())
            .updatedAt(post.updatedAt())
            .build();
    }

    public CommunityPostLikeResponse toPostLikeResponse(long postId, boolean liked, long likeCount) {
        return CommunityPostLikeResponse.builder()
            .postId(ResponseId.of(postId))
            .liked(liked)
            .likeCount(likeCount)
            .build();
    }

    public CommunityCommercialComparisonDraftResponse toCommercialComparisonDraftResponse(
        CommunityCommercialComparisonDraftInfo info
    ) {
        return CommunityCommercialComparisonDraftResponse.builder()
            .targetType(info.targetType().toMetadata())
            .targetCode(info.targetCode())
            .targetName(info.targetName())
            .title(info.title())
            .content(info.content())
            .analysisType(info.analysisType().toMetadata())
            .analysisRefCode(info.analysisRefCode())
            .analysisRefName(info.analysisRefName())
            .analysisSnapshotKey(info.analysisSnapshotKey())
            .build();
    }

    private CommunityPostSummaryItem toPostSummaryItem(CommunityPost post, Map<Long, List<CommunityPostImage>> imagesByPostId) {
        return CommunityPostSummaryItem.builder()
            .thumbnailUrl(toThumbnailUrl(imagesByPostId.get(post.id())))
            .postId(ResponseId.of(post.id()))
            .memberId(ResponseId.of(post.memberId()))
            .targetType(post.targetType().toMetadata())
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
            .postId(ResponseId.of(post.id()))
            .memberId(ResponseId.of(post.memberId()))
            .targetType(post.targetType().toMetadata())
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

    private List<CommunityPostImageItem> toImageItems(List<CommunityPostImage> images) {
        if (images == null || images.isEmpty()) {
            return List.of();
        }
        return images.stream()
            .map(image -> CommunityPostImageItem.builder()
                .imageKey(image.imageKey())
                .imageUrl(objectStorageClient.toPublicUrl(image.imageKey()))
                .sortOrder(image.sortOrder())
                .build())
            .toList();
    }

    /** 목록 카드용 대표 이미지. 정렬 순서상 첫 장을 쓴다. */
    private String toThumbnailUrl(List<CommunityPostImage> images) {
        if (images == null || images.isEmpty()) {
            return null;
        }
        return objectStorageClient.toPublicUrl(images.get(0).imageKey());
    }

    /** 커서 조회 결과를 응답 형태로 옮긴다. hasNext 는 그대로 넘겨 무한스크롤 종료 조건을 유지한다. */
    private <S, T> SliceResponse<T> toSliceResponse(SliceQueryResult<S> slice, Function<S, T> mapper) {
        return new SliceResponse<>(slice.content().stream().map(mapper).toList(), slice.hasNext());
    }
}
