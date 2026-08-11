package com.followfollowme.nowdoboss.domainlayer.community.application.service;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityCommercialComparisonDraftRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityPostCreateRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityPostUpdateRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityCommercialComparisonDraftResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostsResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostLikeResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostListResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.presenter.CommunityPostPresenter;
import com.followfollowme.nowdoboss.domainlayer.community.application.command.CreatePostCommand;
import com.followfollowme.nowdoboss.domainlayer.community.application.command.UpdatePostCommand;
import com.followfollowme.nowdoboss.domainlayer.community.application.model.CommunityCommercialComparisonDraftInfo;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.in.CommunityPostWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.community.application.service.processor.CommunityCommandProcessor;
import com.followfollowme.nowdoboss.domainlayer.community.application.service.processor.CommunityPostImageProcessor;
import com.followfollowme.nowdoboss.domainlayer.community.application.service.processor.CommunityQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostImageUploadResponse;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPostImage;
import com.followfollowme.nowdoboss.storage.client.ObjectStorageClient;
import com.followfollowme.nowdoboss.storage.model.FileUploadCommand;
import com.followfollowme.nowdoboss.storage.model.StorageDomain;
import com.followfollowme.nowdoboss.storage.model.StoredObject;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Slice;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityAnalysisType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityTargetMeta;
import com.followfollowme.nowdoboss.common.enums.OrderType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommunityPostWebFacade implements CommunityPostWebUseCase {

    private final CommunityQueryProcessor communityQueryProcessor;
    private final CommunityCommandProcessor communityCommandProcessor;
    private final CommunityPostPresenter communityPostPresenter;
    private final CommunityPostImageProcessor communityPostImageProcessor;
    private final ObjectStorageClient objectStorageClient;

    @Override
    @Transactional(readOnly = true)
    public CommunityPostListResponse getPosts(
        CommunitySortType sortType, OrderType orderType, String targetType, String targetCode, long lastPostId, long lastLikeCount,
        int size
    ) {
        CommunityTargetMeta targetMeta = null;
        if (targetType != null && !targetType.isBlank() && targetCode != null && !targetCode.isBlank()) {
            targetMeta = communityQueryProcessor.getTargetMeta(targetType, targetCode);
        }

        Slice<CommunityPost> feed = communityQueryProcessor.getFeed(
            sortType, orderType, targetType, targetCode, lastPostId, lastLikeCount, size);
        return communityPostPresenter.toPostListResponse(targetMeta, feed, toImagesByPostId(feed));
    }

    @Override
    public CommunityPostDetailResponse createPost(long memberId, CommunityPostCreateRequest request) {
        CreatePostCommand command = new CreatePostCommand(
            request.targetType(), request.targetCode(), request.title(), request.content(), request.imageKeys());
        CommunityPost post = communityCommandProcessor.createPost(memberId, command);
        communityPostImageProcessor.replaceImages(memberId, post.id(), command.imageKeys());
        return communityPostPresenter.toPostDetailResponse(post, communityPostImageProcessor.getImages(post.id()));
    }

    @Override
    @Transactional(readOnly = true)
    public CommunityCommercialComparisonDraftResponse createCommercialComparisonDraft(CommunityCommercialComparisonDraftRequest request) {
        CommunityTargetMeta targetMeta = communityQueryProcessor.getTargetMeta(request.targetType(), request.targetCode());
        CommunityTargetMeta leftTarget = communityQueryProcessor.getTargetMeta("COMMERCIAL", request.leftCommercialCode());
        CommunityTargetMeta rightTarget = communityQueryProcessor.getTargetMeta("COMMERCIAL", request.rightCommercialCode());

        String analysisRefCode = "%s:%s:%s:%s".formatted(
            request.leftCommercialCode(),
            request.rightCommercialCode(),
            request.serviceCode(),
            request.periodCode()
        );
        String analysisRefName = "%s vs %s".formatted(leftTarget.targetName(), rightTarget.targetName());

        CommunityCommercialComparisonDraftInfo info = CommunityCommercialComparisonDraftInfo.builder()
            .targetType(targetMeta.targetType())
            .targetCode(targetMeta.targetCode())
            .targetName(targetMeta.targetName())
            .title("%s 비교 분석".formatted(analysisRefName))
            .content("""
                %s와 %s 상권을 비교해 보려 합니다.

                - 서비스 코드: %s
                - 기준 분기: %s
                - 실제 비교 포인트나 운영 경험이 있다면 이야기해 보면 좋겠습니다.
                """.formatted(leftTarget.targetName(), rightTarget.targetName(), request.serviceCode(), request.periodCode()).trim())
            .analysisType(CommunityAnalysisType.COMMERCIAL_COMPARISON)
            .analysisRefCode(analysisRefCode)
            .analysisRefName(analysisRefName)
            .analysisSnapshotKey("comparison-%s-%s-%s".formatted(
                request.leftCommercialCode(),
                request.rightCommercialCode(),
                request.periodCode()
            ))
            .build();

        return communityPostPresenter.toCommercialComparisonDraftResponse(info);
    }

    @Override
    @Transactional
    public CommunityPostDetailResponse getPost(long postId) {
        CommunityPost post = communityQueryProcessor.getPost(postId);
        CommunityPost updated = communityCommandProcessor.incrementViewCount(post);
        return communityPostPresenter.toPostDetailResponse(updated, communityPostImageProcessor.getImages(postId));
    }

    @Override
    public CommunityPostDetailResponse updatePost(long memberId, long postId, CommunityPostUpdateRequest request) {
        CommunityPost post = communityQueryProcessor.getPost(postId);
        UpdatePostCommand command = new UpdatePostCommand(request.title(), request.content(), request.imageKeys());
        CommunityPost updated = communityCommandProcessor.updatePost(memberId, post, command);
        List<String> removedImageKeys = communityPostImageProcessor.replaceImages(memberId, postId, command.imageKeys());
        // 커밋 이후에 지운다. 롤백되면 DB 에는 이미지가 남는데 파일만 사라지는 상태가 되기 때문이다.
        objectStorageClient.deleteAllAfterCommit(removedImageKeys);
        return communityPostPresenter.toPostDetailResponse(updated, communityPostImageProcessor.getImages(postId));
    }

    @Override
    public void deletePost(long memberId, long postId) {
        communityCommandProcessor.deletePost(memberId, communityQueryProcessor.getPost(postId));
    }

    @Override
    public CommunityPostLikeResponse togglePostLike(long memberId, long postId) {
        CommunityPost post = communityQueryProcessor.getPost(postId);
        long likeCount = communityCommandProcessor.togglePostLike(memberId, post);
        return communityPostPresenter.toPostLikeResponse(postId, likeCount > post.likeCount(), likeCount);
    }

    @Override
    @Transactional(readOnly = true)
    public CommunityLikedPostsResponse getLikedPosts(
        long memberId, CommunitySortType sortType, OrderType orderType, long lastPostId, long lastLikeCount, int size
    ) {
        return communityPostPresenter.toLikedPostsResponse(
            communityQueryProcessor.getLikedPosts(memberId, sortType, orderType, lastPostId, lastLikeCount, size)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public CommunityPostListResponse searchPosts(
        String keyword, CommunitySortType sortType, OrderType orderType, long lastPostId, long lastLikeCount, int size
    ) {
        Slice<CommunityPost> searched = communityQueryProcessor.searchPosts(
            keyword, sortType, orderType, lastPostId, lastLikeCount, size);
        return communityPostPresenter.toPostListResponse(null, searched, toImagesByPostId(searched));
    }

    /**
     * 게시글 이미지 업로드. 업로드 시점에는 게시글에 연결하지 않고 키만 발급한다.
     * 클라이언트가 그 키를 게시글 작성/수정 요청에 담아 보내면 그때 연결된다.
     * 키에 memberId 가 들어 있어, 연결 시점에 남의 파일을 붙이려는 시도를 걸러낼 수 있다.
     */
    @Override
    public List<CommunityPostImageUploadResponse> uploadPostImages(long memberId, List<FileUploadCommand> commands) {
        List<StoredObject> uploaded = new ArrayList<>(commands.size());
        try {
            commands.forEach(command ->
                uploaded.add(objectStorageClient.uploadImage(StorageDomain.COMMUNITY_POST, memberId, command)));
        } catch (RuntimeException exception) {
            // 일부만 올라간 채 실패하면 나머지는 어디에도 참조되지 않으므로 즉시 회수한다.
            uploaded.forEach(storedObject -> objectStorageClient.deleteQuietly(storedObject.objectKey()));
            throw exception;
        }
        return uploaded.stream()
            .map(storedObject -> CommunityPostImageUploadResponse.builder()
                .imageKey(storedObject.objectKey())
                .imageUrl(storedObject.publicUrl())
                .build())
            .toList();
    }

    private Map<Long, List<CommunityPostImage>> toImagesByPostId(Slice<CommunityPost> posts) {
        return communityPostImageProcessor.getImagesByPostIds(
            posts.getContent().stream().map(CommunityPost::id).toList());
    }
}
