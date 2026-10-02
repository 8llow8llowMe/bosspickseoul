package com.followfollowme.bosspickseoul.domainlayer.community.application.model;

import java.util.Set;

/**
 * 조회자가 목록 한 쪽(또는 상세 한 건)의 게시글을 좋아요했는지 모아 둔 것.
 *
 * <p>비로그인과 "안 누름"을 구분해야 한다. 비로그인이면 {@link #likedOf(long)} 가 null, 로그인이면 true/false 다.
 * null 을 Presenter 에 신호로 흘리면 "조회 안 함"과 "조회 결과 없음"이 같은 값이 되므로 값 객체로 감싼다.
 *
 * @param authenticated 로그인 요청인지. false 면 {@code likedPostIds} 는 의미가 없다
 * @param likedPostIds  조회 대상 중 조회자가 좋아요한 게시글 아이디
 */
public record CommunityViewerLikes(
    boolean authenticated,
    Set<Long> likedPostIds
) {

    private static final CommunityViewerLikes ANONYMOUS = new CommunityViewerLikes(false, Set.of());

    public CommunityViewerLikes {
        likedPostIds = Set.copyOf(likedPostIds);
    }

    /** 비로그인 조회. 모든 게시글의 좋아요 여부가 null 이다. */
    public static CommunityViewerLikes anonymous() {
        return ANONYMOUS;
    }

    /** 로그인 조회. {@code likedPostIds} 에 없는 게시글은 안 누른 것(false)이다. */
    public static CommunityViewerLikes of(Set<Long> likedPostIds) {
        return new CommunityViewerLikes(true, likedPostIds);
    }

    /** 비로그인이면 null, 로그인이면 좋아요 여부. */
    public Boolean likedOf(long postId) {
        return authenticated ? likedPostIds.contains(postId) : null;
    }
}
