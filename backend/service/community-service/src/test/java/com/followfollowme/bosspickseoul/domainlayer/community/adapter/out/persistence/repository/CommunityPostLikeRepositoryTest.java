package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostLikeEntity;
import com.followfollowme.bosspickseoul.global.config.CommunityDataJpaTest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * 목록 좋아요 여부(#471) 일괄 조회 JPQL({@code memberId = ? and postId in (...)} 의 postId 프로젝션)을 실제 스키마(H2)에 질의해 확인한다.
 * 빈 postIds 는 어댑터가 쿼리 전에 걸러 내므로 여기서 다루지 않는다.
 */
@CommunityDataJpaTest
class CommunityPostLikeRepositoryTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 6, 12, 0);
    private static final long VIEWER_ID = 93001L;
    private static final long OTHER_MEMBER_ID = 93002L;

    @Autowired private CommunityPostLikeRepository likeRepository;

    @Test
    @DisplayName("주어진 postIds 중 그 회원이 좋아요한 글만 돌려준다 — 다른 회원의 좋아요와 범위 밖 postId 는 빠진다")
    void findsOnlyViewerLikesWithinGivenPostIds() {
        like(1L, 7001L, VIEWER_ID);
        like(2L, 7002L, VIEWER_ID);
        like(3L, 7004L, VIEWER_ID);          // 조회 범위 밖
        like(4L, 7003L, OTHER_MEMBER_ID);    // 다른 회원만 좋아요
        like(5L, 7001L, OTHER_MEMBER_ID);    // 같은 글을 다른 회원도 좋아요 → 중복 행이 나오면 안 된다

        Set<Long> page = Set.of(7001L, 7002L, 7003L, 7005L);

        assertThat(likeRepository.findLikedPostIds(VIEWER_ID, page)).containsExactlyInAnyOrder(7001L, 7002L);
        assertThat(likeRepository.findLikedPostIds(OTHER_MEMBER_ID, page)).containsExactlyInAnyOrder(7001L, 7003L);
        assertThat(likeRepository.findLikedPostIds(99999L, page)).isEmpty();
        assertThat(likeRepository.findLikedPostIds(VIEWER_ID, List.of(7004L))).containsExactly(7004L);
        assertThat(likeRepository.findLikedPostIds(VIEWER_ID, List.of(7003L, 7005L))).isEmpty();
    }

    private void like(long id, long postId, long memberId) {
        likeRepository.saveAndFlush(CommunityPostLikeEntity.builder().id(id).postId(postId).memberId(memberId).createdAt(NOW).build());
    }
}
