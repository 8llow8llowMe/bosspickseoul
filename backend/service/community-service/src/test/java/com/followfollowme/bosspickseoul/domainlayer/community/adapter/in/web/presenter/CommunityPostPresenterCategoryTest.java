package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.presenter;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostItem;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostSummaryItem;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityViewerLikes;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.SliceQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostCategory;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.LikedCommunityPost;
import com.followfollowme.bosspickseoul.storage.client.ObjectStorageClient;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 게시글 말머리(#470)를 목록·검색 항목, 상세(작성·수정 응답 포함), 좋아요 목록 항목에 {@code {code, name, description}} 으로 싣는지 검증한다.
 * 말머리 없는 글(기존 글 포함)은 null 이다.
 */
@ExtendWith(MockitoExtension.class)
class CommunityPostPresenterCategoryTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 2, 12, 0);
    private static final CodeNameDescriptionMetadata QUESTION_METADATA = CodeNameDescriptionMetadata.of("QUESTION", "질문", "질문");

    @Mock private ObjectStorageClient objectStorageClient;

    private CommunityPostPresenter presenter;

    @BeforeEach
    void setUp() {
        presenter = new CommunityPostPresenter(objectStorageClient);
    }

    @Test
    @DisplayName("상세 응답은 말머리가 있으면 metadata, 없으면 null 이다")
    void detail_category() {
        assertThat(detail(CommunityPostCategory.QUESTION).category()).isEqualTo(QUESTION_METADATA);
        assertThat(detail(null).category()).isNull();
    }

    @Test
    @DisplayName("목록·검색 항목은 글마다 말머리 metadata 또는 null 을 싣는다")
    void summaryItems_category() {
        SliceQueryResult<CommunityPost> posts = SliceQueryResult.of(List.of(post(1L, CommunityPostCategory.QUESTION), post(2L, null)), false);

        List<CommunityPostSummaryItem> items = presenter.toPostListResponse(
            null, posts, Map.of(), Map.of(), CommunityViewerLikes.anonymous()).posts().contents();

        assertThat(items).extracting(CommunityPostSummaryItem::category).containsExactly(QUESTION_METADATA, null);
    }

    @Test
    @DisplayName("좋아요 목록 항목도 말머리 metadata 또는 null 을 싣는다")
    void likedItems_category() {
        SliceQueryResult<LikedCommunityPost> posts = SliceQueryResult.of(List.of(
            new LikedCommunityPost(post(1L, CommunityPostCategory.QUESTION), NOW), new LikedCommunityPost(post(2L, null), NOW)), false);

        List<CommunityLikedPostItem> items = presenter.toLikedPostsResponse(posts, Map.of()).posts().contents();

        assertThat(items).extracting(CommunityLikedPostItem::category).containsExactly(QUESTION_METADATA, null);
    }

    private CommunityPostDetailResponse detail(CommunityPostCategory category) {
        return presenter.toPostDetailResponse(post(1L, category), List.of(), Map.of(), CommunityViewerLikes.anonymous());
    }

    private static CommunityPost post(long postId, CommunityPostCategory category) {
        return new CommunityPost(
            postId, 40L, CommunityTargetType.COMMERCIAL, "C1", "target", "title", "content", category,
            null, null, null, null,
            CommunityPostStatus.ACTIVE, 0L, 0L, 0L, NOW, NOW
        );
    }
}
