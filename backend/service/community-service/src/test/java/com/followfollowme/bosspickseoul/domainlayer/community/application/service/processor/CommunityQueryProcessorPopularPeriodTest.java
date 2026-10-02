package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import com.followfollowme.bosspickseoul.common.enums.OrderType;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityFeedCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityLikedPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunitySearchPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityTargetMetaRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPopularPeriod;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunitySortType;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 인기순 기간이 Criteria 의 작성 시각 하한(popularSince)으로 옮겨지는지 검증한다.
 *
 * <p>하한 계산 자체는 {@link CommunityPopularPeriod#since} 의 순수 함수 테스트가 맡고, 여기서는 현재 시각에 의존하므로
 * 호출 전후 시각으로 범위만 본다. ALL 은 하한이 없어 null 이어야 리포지터리가 작성 시각 조건을 붙이지 않는다.
 */
@ExtendWith(MockitoExtension.class)
class CommunityQueryProcessorPopularPeriodTest {

    private static final long MEMBER_ID = 30L;

    @Mock private CommunityPostRepositoryPort communityPostRepositoryPort;
    @Mock private CommunityCommentRepositoryPort communityCommentRepositoryPort;
    @Mock private CommunityTargetMetaRepositoryPort communityTargetMetaRepositoryPort;

    @InjectMocks private CommunityQueryProcessor processor;

    @Test
    @DisplayName("목록 WEEK 는 현재 시각 기준 7일 전을 하한으로 넘긴다")
    void feed_week_passesSevenDayLowerBound() {
        LocalDateTime before = LocalDateTime.now();
        processor.getFeed(CommunitySortType.POPULAR, OrderType.DESC, CommunityPopularPeriod.WEEK, null, null, 0L, 0L, 20);
        LocalDateTime after = LocalDateTime.now();

        assertThat(captureFeed().popularSince()).isBetween(before.minusDays(7), after.minusDays(7));
    }

    @Test
    @DisplayName("목록 ALL 은 하한 없이 null 을 넘긴다")
    void feed_all_passesNoLowerBound() {
        processor.getFeed(CommunitySortType.POPULAR, OrderType.DESC, CommunityPopularPeriod.ALL, null, null, 0L, 0L, 20);

        assertThat(captureFeed().popularSince()).isNull();
    }

    @Test
    @DisplayName("검색 MONTH 는 현재 시각 기준 30일 전을 하한으로 넘긴다")
    void search_month_passesThirtyDayLowerBound() {
        LocalDateTime before = LocalDateTime.now();
        processor.searchPosts("카페", CommunitySortType.POPULAR, OrderType.DESC, CommunityPopularPeriod.MONTH, 0L, 0L, 10);
        LocalDateTime after = LocalDateTime.now();

        ArgumentCaptor<CommunitySearchPostCriteria> captor = ArgumentCaptor.forClass(CommunitySearchPostCriteria.class);
        verify(communityPostRepositoryPort).searchPosts(captor.capture());
        assertThat(captor.getValue().popularSince()).isBetween(before.minusDays(30), after.minusDays(30));
    }

    @Test
    @DisplayName("좋아요 목록 ALL 은 하한 없이 null 을 넘긴다")
    void liked_all_passesNoLowerBound() {
        processor.getLikedPosts(MEMBER_ID, CommunitySortType.POPULAR, OrderType.DESC, CommunityPopularPeriod.ALL, 0L, 0L, 20);

        ArgumentCaptor<CommunityLikedPostCriteria> captor = ArgumentCaptor.forClass(CommunityLikedPostCriteria.class);
        verify(communityPostRepositoryPort).getLikedPosts(captor.capture());
        assertThat(captor.getValue().popularSince()).isNull();
        assertThat(captor.getValue().memberId()).isEqualTo(MEMBER_ID);
    }

    private CommunityFeedCriteria captureFeed() {
        ArgumentCaptor<CommunityFeedCriteria> captor = ArgumentCaptor.forClass(CommunityFeedCriteria.class);
        verify(communityPostRepositoryPort).getFeedPosts(captor.capture());
        return captor.getValue();
    }
}
