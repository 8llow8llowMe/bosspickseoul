package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityViewerLikes;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostLikeRepositoryPort;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 목록·상세 응답의 {@code liked} 를 채우는 조회자 좋아요 조회를 검증한다.
 *
 * <p>비로그인과 "안 누름"을 구분해야 하고(비로그인은 null), 목록은 게시글마다 존재 확인을 부르지 않고
 * 한 쪽의 postId 를 모아 1회로 조회해야 한다(coding-conventions §9-7).
 */
@ExtendWith(MockitoExtension.class)
class CommunityViewerLikeProcessorTest {

    private static final long VIEWER_ID = 30L;

    @Mock private CommunityPostLikeRepositoryPort communityPostLikeRepositoryPort;

    @InjectMocks private CommunityViewerLikeProcessor processor;

    @Test
    @DisplayName("비로그인 목록은 좋아요 포트를 부르지 않고 모든 게시글의 liked 가 null 이다")
    void getViewerLikes_anonymous_returnsNullWithoutPortCall() {
        CommunityViewerLikes viewerLikes = processor.getViewerLikes(null, List.of(1L, 2L, 3L));

        assertThat(viewerLikes.likedOf(1L)).isNull();
        assertThat(viewerLikes.likedOf(2L)).isNull();
        verifyNoInteractions(communityPostLikeRepositoryPort);
    }

    @Test
    @DisplayName("로그인 목록은 한 쪽의 postId 를 한 번에 넘겨 1회 조회하고 결과대로 true/false 를 채운다")
    void getViewerLikes_authenticated_queriesWholePageOnce() {
        List<Long> pagePostIds = List.of(1L, 2L, 3L);
        when(communityPostLikeRepositoryPort.findLikedPostIds(VIEWER_ID, pagePostIds)).thenReturn(Set.of(2L));

        CommunityViewerLikes viewerLikes = processor.getViewerLikes(VIEWER_ID, pagePostIds);

        assertThat(viewerLikes.likedOf(1L)).isFalse();
        assertThat(viewerLikes.likedOf(2L)).isTrue();
        assertThat(viewerLikes.likedOf(3L)).isFalse();
        verify(communityPostLikeRepositoryPort, times(1)).findLikedPostIds(VIEWER_ID, pagePostIds);
    }

    @Test
    @DisplayName("로그인이어도 빈 쪽이면 좋아요 포트를 부르지 않는다")
    void getViewerLikes_emptyPage_skipsPortCall() {
        CommunityViewerLikes viewerLikes = processor.getViewerLikes(VIEWER_ID, List.of());

        assertThat(viewerLikes.likedOf(1L)).isFalse();
        verifyNoInteractions(communityPostLikeRepositoryPort);
    }

    @Test
    @DisplayName("비로그인 상세는 존재 확인을 부르지 않고 liked 가 null 이다")
    void getViewerLike_anonymous_returnsNullWithoutPortCall() {
        assertThat(processor.getViewerLike(null, 1L).likedOf(1L)).isNull();
        verifyNoInteractions(communityPostLikeRepositoryPort);
    }

    @Test
    @DisplayName("로그인 상세는 토글과 같은 단건 존재 확인으로 liked 를 채운다")
    void getViewerLike_authenticated_usesSingleExistsCheck() {
        when(communityPostLikeRepositoryPort.exists(1L, VIEWER_ID)).thenReturn(true);
        when(communityPostLikeRepositoryPort.exists(2L, VIEWER_ID)).thenReturn(false);

        assertThat(processor.getViewerLike(VIEWER_ID, 1L).likedOf(1L)).isTrue();
        assertThat(processor.getViewerLike(VIEWER_ID, 2L).likedOf(2L)).isFalse();
    }
}
