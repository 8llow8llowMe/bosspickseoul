package com.followfollowme.bosspickseoul.domainlayer.community.application.service;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.CommunityCommercialComparisonDraftRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.CommunityPostCreateRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.CommunityPostUpdateRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityCommercialComparisonDraftResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostsResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostLikeResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostListResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.presenter.CommunityPostPresenter;
import com.followfollowme.bosspickseoul.domainlayer.community.application.command.CreatePostCommand;
import com.followfollowme.bosspickseoul.domainlayer.community.application.command.UpdatePostCommand;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityCommercialComparisonDraftInfo;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.in.CommunityPostWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityCommandProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityPostImageProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostImageUploadResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPostImage;
import com.followfollowme.bosspickseoul.storage.client.ObjectStorageClient;
import com.followfollowme.bosspickseoul.storage.model.FileUploadCommand;
import com.followfollowme.bosspickseoul.storage.model.StorageDomain;
import com.followfollowme.bosspickseoul.storage.model.StoredObject;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.SliceQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityAnalysisType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityTargetMeta;
import com.followfollowme.bosspickseoul.common.enums.OrderType;
import com.followfollowme.bosspickseoul.domainlayer.community.application.info.CommunityLikeToggleResult;
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

        SliceQueryResult<CommunityPost> feed = communityQueryProcessor.getFeed(
            sortType, orderType, targetType, targetCode, lastPostId, lastLikeCount, size);
        return communityPostPresenter.toPostListResponse(targetMeta, feed, toImagesByPostId(feed));
    }

    /**
     * 게시글 작성. 본문 저장과 이미지 연결을 한 트랜잭션으로 묶는다.
     * 분리하면 이미지 키 소유권 검증에 실패했을 때 이미지 없는 게시글이 이미 커밋된 채로 남는다.
     * (파일 업로드 자체는 별도 API 에서 트랜잭션 밖으로 끝난 상태라 여기서 원격 I/O 는 일어나지 않는다)
     */
    @Override
    @Transactional
    public CommunityPostDetailResponse createPost(long memberId, CommunityPostCreateRequest request) {
        CreatePostCommand command = new CreatePostCommand(
            request.targetType(), request.targetCode(), request.title(), request.content(), request.imageKeys(),
            request.analysisType(), request.analysisRefCode(), request.analysisRefName(), request.analysisSnapshotKey());
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

    /**
     * 게시글 수정. 트랜잭션이 없으면 아래 deleteAllAfterCommit 이 동기화 없음 경로로 빠져 즉시 삭제되므로,
     * "롤백 시 파일은 남긴다"는 보장이 무력화된다.
     */
    @Override
    @Transactional
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
    @Transactional
    public void deletePost(long memberId, long postId) {
        communityCommandProcessor.deletePost(memberId, communityQueryProcessor.getPost(postId));
    }

    @Override
    @Transactional
    public CommunityPostLikeResponse togglePostLike(long memberId, long postId) {
        CommunityPost post = communityQueryProcessor.getPost(postId);
        CommunityLikeToggleResult result = communityCommandProcessor.togglePostLike(memberId, post);
        return communityPostPresenter.toPostLikeResponse(postId, result.liked(), result.likeCount());
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
        SliceQueryResult<CommunityPost> searched = communityQueryProcessor.searchPosts(
            keyword, sortType, orderType, lastPostId, lastLikeCount, size);
        return communityPostPresenter.toPostListResponse(null, searched, toImagesByPostId(searched));
    }

    /**
     * 게시글 이미지 업로드. 업로드 시점에는 게시글에 연결하지 않고 키만 발급한다.
     * 클라이언트가 그 키를 게시글 작성/수정 요청에 담아 보내면 그때 연결된다.
     * 키에 memberId 가 들어 있어, 연결 시점에 남의 파일을 붙이려는 시도를 걸러낼 수 있다.
     *
     * <p>DB 를 건드리지 않고 원격 I/O 만 하므로 의도적으로 트랜잭션을 걸지 않는다.
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

    private Map<Long, List<CommunityPostImage>> toImagesByPostId(SliceQueryResult<CommunityPost> posts) {
        return communityPostImageProcessor.getImagesByPostIds(
            posts.content().stream().map(CommunityPost::id).toList());
    }
}
