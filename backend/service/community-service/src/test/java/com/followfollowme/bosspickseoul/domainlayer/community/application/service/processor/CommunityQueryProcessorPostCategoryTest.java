package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.common.enums.OrderType;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityFeedCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityTargetMetaRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPopularPeriod;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostCategory;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityTargetMeta;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 목록 말머리 필터(#470)가 Criteria 의 category 로 옮겨지는지 검증한다.
 *
 * <p>비어 있으면 필터 없음(null)이고, 값은 enum 으로 파싱해 대상 필터·정렬·기간·커서와 함께 넘긴다. 잘못된 값은 대상 실조회(원격 호출) 전에 거른다.
 */
@ExtendWith(MockitoExtension.class)
class CommunityQueryProcessorPostCategoryTest {

    @Mock private CommunityPostRepositoryPort communityPostRepositoryPort;
    @Mock private CommunityCommentRepositoryPort communityCommentRepositoryPort;
    @Mock private CommunityTargetMetaRepositoryPort communityTargetMetaRepositoryPort;

    @InjectMocks private CommunityQueryProcessor processor;

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"  "})
    @DisplayName("말머리가 비어 있으면 필터 없이(null) 넘긴다")
    void feed_blankCategory_passesNoFilter(String category) {
        processor.getFeed(CommunitySortType.LATEST, OrderType.DESC, CommunityPopularPeriod.WEEK, null, null, category, 0L, 0L, 20);

        assertThat(captureFeed().category()).isNull();
    }

    @Test
    @DisplayName("말머리 값은 대소문자를 가리지 않고 파싱해 넘긴다")
    void feed_category_isParsed() {
        processor.getFeed(CommunitySortType.LATEST, OrderType.DESC, CommunityPopularPeriod.WEEK, null, null, "question", 0L, 0L, 20);

        assertThat(captureFeed().category()).isEqualTo(CommunityPostCategory.QUESTION);
    }

    @Test
    @DisplayName("대상 필터·인기순·기간·커서와 함께 말머리를 넘긴다")
    void feed_categoryWithTargetFilterAndCursor_passesAll() {
        when(communityTargetMetaRepositoryPort.findTargetMeta(CommunityTargetType.COMMERCIAL, "3110008"))
            .thenReturn(Optional.of(new CommunityTargetMeta(CommunityTargetType.COMMERCIAL, "3110008", "강남역")));

        processor.getFeed(
            CommunitySortType.POPULAR, OrderType.DESC, CommunityPopularPeriod.ALL, "COMMERCIAL", "3110008", "TOGETHER", 99L, 5L, 10);

        CommunityFeedCriteria criteria = captureFeed();
        assertThat(criteria.category()).isEqualTo(CommunityPostCategory.TOGETHER);
        assertThat(criteria.targetType()).isEqualTo(CommunityTargetType.COMMERCIAL);
        assertThat(criteria.targetCode()).isEqualTo("3110008");
        assertThat(criteria.sortType()).isEqualTo(CommunitySortType.POPULAR);
        assertThat(criteria.popularSince()).isNull();
        assertThat(criteria.lastPostId()).isEqualTo(99L);
        assertThat(criteria.lastLikeCount()).isEqualTo(5L);
        assertThat(criteria.size()).isEqualTo(10);
    }

    @Test
    @DisplayName("잘못된 말머리는 COMMUNITY_017 이며 대상 실조회·목록 조회를 하지 않는다")
    void feed_invalidCategory_rejectedBeforeAnyLookup() {
        assertThatThrownBy(() -> processor.getFeed(
            CommunitySortType.LATEST, OrderType.DESC, CommunityPopularPeriod.WEEK, "COMMERCIAL", "3110008", "WRONG", 0L, 0L, 20))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.INVALID_POST_CATEGORY);

        verifyNoInteractions(communityTargetMetaRepositoryPort, communityPostRepositoryPort);
    }

    private CommunityFeedCriteria captureFeed() {
        ArgumentCaptor<CommunityFeedCriteria> captor = ArgumentCaptor.forClass(CommunityFeedCriteria.class);
        verify(communityPostRepositoryPort).getFeedPosts(captor.capture());
        return captor.getValue();
    }
}
