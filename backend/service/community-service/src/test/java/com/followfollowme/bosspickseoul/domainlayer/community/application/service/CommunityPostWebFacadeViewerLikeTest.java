package com.followfollowme.bosspickseoul.domainlayer.community.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.common.enums.OrderType;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostItem;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostsResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostListResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostSummaryItem;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.presenter.CommunityPostPresenter;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostLikeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.SliceQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityCommandProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityPostImageProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityViewerLikeProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityWriterSummaryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPopularPeriod;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.LikedCommunityPost;
import com.followfollowme.bosspickseoul.storage.client.ObjectStorageClient;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 목록·검색·좋아요 목록·상세 응답의 {@code viewCount}·{@code liked} 를 유스케이스 단위로 검증한다.
 *
 * <p>Facade → {@link CommunityViewerLikeProcessor} → Presenter 를 실제 객체로 묶고 좋아요 포트만 목으로 둔다.
 * 로그인 목록은 쪽의 postId 를 한 번에 넘겨 포트를 1회만 불러야 하고(N+1 금지), 비로그인은 포트를 부르지 않고 liked 가 null 이다.
 */
@ExtendWith(MockitoExtension.class)
class CommunityPostWebFacadeViewerLikeTest {

    private static final long VIEWER_ID = 30L;
    private static final long WRITER_ID = 40L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 2, 12, 0);

    @Mock private CommunityQueryProcessor communityQueryProcessor;
    @Mock private CommunityCommandProcessor communityCommandProcessor;
    @Mock private CommunityPostImageProcessor communityPostImageProcessor;
    @Mock private CommunityWriterSummaryProcessor communityWriterSummaryProcessor;
    @Mock private ObjectStorageClient objectStorageClient;
    @Mock private CommunityPostLikeRepositoryPort communityPostLikeRepositoryPort;

    private CommunityPostWebFacade facade;

    @BeforeEach
    void setUp() {
        facade = new CommunityPostWebFacade(
            communityQueryProcessor, communityCommandProcessor, new CommunityPostPresenter(objectStorageClient),
            communityPostImageProcessor, communityWriterSummaryProcessor,
            new CommunityViewerLikeProcessor(communityPostLikeRepositoryPort), objectStorageClient);
    }

    @Test
    @DisplayName("비로그인 목록은 좋아요 포트를 부르지 않고 liked 가 null, viewCount 는 그대로 내린다")
    void getPosts_anonymous_likedIsNull() {
        stubFeed(post(1L, 11L), post(2L, 22L));

        CommunityPostListResponse response = getPosts(null);

        assertThat(response.posts().contents())
            .extracting(CommunityPostSummaryItem::postId, CommunityPostSummaryItem::viewCount, CommunityPostSummaryItem::liked)
            .containsExactly(tuple("1", 11L, null), tuple("2", 22L, null));
        verifyNoInteractions(communityPostLikeRepositoryPort);
    }

    @Test
    @DisplayName("로그인 목록은 쪽의 postId 를 한 번에 넘겨 1회 조회하고 결과대로 true/false 를 채운다")
    void getPosts_authenticated_queriesPageOnce() {
        stubFeed(post(1L, 0L), post(2L, 0L), post(3L, 0L));
        when(communityPostLikeRepositoryPort.findLikedPostIds(VIEWER_ID, List.of(1L, 2L, 3L))).thenReturn(Set.of(2L));

        CommunityPostListResponse response = getPosts(VIEWER_ID);

        assertThat(response.posts().contents())
            .extracting(CommunityPostSummaryItem::postId, CommunityPostSummaryItem::liked)
            .containsExactly(tuple("1", false), tuple("2", true), tuple("3", false));
        verify(communityPostLikeRepositoryPort, times(1)).findLikedPostIds(anyLong(), any());
    }

    @Test
    @DisplayName("로그인이어도 빈 쪽이면 좋아요 포트를 부르지 않는다")
    void getPosts_emptyPage_skipsLikeQuery() {
        stubFeed();

        assertThat(getPosts(VIEWER_ID).posts().contents()).isEmpty();
        verifyNoInteractions(communityPostLikeRepositoryPort);
    }

    @Test
    @DisplayName("로그인 검색도 쪽의 postId 를 한 번에 넘겨 1회 조회한다")
    void searchPosts_authenticated_queriesPageOnce() {
        when(communityQueryProcessor.searchPosts(any(), any(), any(), any(), anyLong(), anyLong(), anyInt()))
            .thenReturn(SliceQueryResult.of(List.of(post(5L, 3L), post(6L, 4L)), false));
        when(communityPostLikeRepositoryPort.findLikedPostIds(VIEWER_ID, List.of(5L, 6L))).thenReturn(Set.of(5L, 6L));

        CommunityPostListResponse response = facade.searchPosts(
            VIEWER_ID, "카페", CommunitySortType.LATEST, OrderType.DESC, CommunityPopularPeriod.WEEK, 0L, 0L, 10);

        assertThat(response.posts().contents())
            .extracting(CommunityPostSummaryItem::viewCount, CommunityPostSummaryItem::liked)
            .containsExactly(tuple(3L, true), tuple(4L, true));
        verify(communityPostLikeRepositoryPort, times(1)).findLikedPostIds(anyLong(), any());
    }

    @Test
    @DisplayName("좋아요한 글 목록은 추가 조회 없이 liked 가 항상 true 이고 viewCount 를 내린다")
    void getLikedPosts_alwaysLikedWithoutExtraQuery() {
        when(communityQueryProcessor.getLikedPosts(anyLong(), any(), any(), any(), anyLong(), anyLong(), anyInt()))
            .thenReturn(SliceQueryResult.of(List.of(new LikedCommunityPost(post(7L, 9L), NOW)), false));

        CommunityLikedPostsResponse response = facade.getLikedPosts(
            VIEWER_ID, CommunitySortType.LATEST, OrderType.DESC, CommunityPopularPeriod.WEEK, 0L, 0L, 20);

        assertThat(response.posts().contents())
            .extracting(CommunityLikedPostItem::viewCount, CommunityLikedPostItem::liked)
            .containsExactly(tuple(9L, true));
        verifyNoInteractions(communityPostLikeRepositoryPort);
    }

    @Test
    @DisplayName("비로그인 상세는 존재 확인을 부르지 않고 liked 가 null 이다")
    void getPost_anonymous_likedIsNull() {
        stubDetail(post(8L, 5L));

        CommunityPostDetailResponse response = facade.getPost(null, 8L);

        assertThat(response.liked()).isNull();
        assertThat(response.viewCount()).isEqualTo(5L);
        verifyNoInteractions(communityPostLikeRepositoryPort);
    }

    @Test
    @DisplayName("로그인 상세는 단건 존재 확인으로 liked 를 채운다")
    void getPost_authenticated_usesExistsCheck() {
        stubDetail(post(8L, 5L));
        when(communityPostLikeRepositoryPort.exists(8L, VIEWER_ID)).thenReturn(true);

        assertThat(facade.getPost(VIEWER_ID, 8L).liked()).isTrue();
    }

    private CommunityPostListResponse getPosts(Long viewerMemberId) {
        return facade.getPosts(viewerMemberId, CommunitySortType.LATEST, OrderType.DESC, CommunityPopularPeriod.WEEK, null, null, 0L, 0L, 20);
    }

    private void stubFeed(CommunityPost... posts) {
        when(communityQueryProcessor.getFeed(any(), any(), any(), any(), any(), anyLong(), anyLong(), anyInt()))
            .thenReturn(SliceQueryResult.of(List.of(posts), false));
    }

    private void stubDetail(CommunityPost post) {
        when(communityQueryProcessor.getPost(post.id())).thenReturn(post);
        when(communityCommandProcessor.incrementViewCount(post)).thenReturn(post);
    }

    private static CommunityPost post(long postId, long viewCount) {
        return new CommunityPost(
            postId, WRITER_ID, CommunityTargetType.COMMERCIAL, "C1", "target", "title", "content",
            null, null, null, null,
            CommunityPostStatus.ACTIVE, 0L, 0L, viewCount, NOW, NOW
        );
    }
}
