package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityViewerLikes;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostLikeRepositoryPort;
import java.util.Collection;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 목록·상세 응답의 {@code liked}(조회자 본인의 좋아요 여부)를 조회한다.
 *
 * <p>공개 조회 API 의 선택 인증 값이라 비로그인({@code viewerMemberId == null})이면 조회하지 않고
 * {@link CommunityViewerLikes#anonymous()} 를 돌려준다 — 응답의 liked 는 null 이 된다.
 * 작성자 요약·첨부 이미지처럼 쪽 단위 부가 정보라 그 Processor 들과 같은 결로 분리했다.
 */
@Component
@RequiredArgsConstructor
public class CommunityViewerLikeProcessor {

    private final CommunityPostLikeRepositoryPort communityPostLikeRepositoryPort;

    /**
     * 목록 한 쪽 분량의 좋아요 여부. 게시글마다 존재 확인을 부르면 쪽 크기만큼 왕복이 생기므로
     * (coding-conventions §9-7) 쪽의 postId 를 모아 in 절 1회로 조회한다. 빈 쪽이면 조회하지 않는다.
     */
    public CommunityViewerLikes getViewerLikes(Long viewerMemberId, Collection<Long> postIds) {
        if (viewerMemberId == null) {
            return CommunityViewerLikes.anonymous();
        }
        if (postIds == null || postIds.isEmpty()) {
            return CommunityViewerLikes.of(Set.of());
        }
        return CommunityViewerLikes.of(communityPostLikeRepositoryPort.findLikedPostIds(viewerMemberId, postIds));
    }

    /** 상세 한 건의 좋아요 여부. 토글이 쓰는 단건 존재 확인(postId + memberId 유니크)을 그대로 쓴다. */
    public CommunityViewerLikes getViewerLike(Long viewerMemberId, long postId) {
        if (viewerMemberId == null) {
            return CommunityViewerLikes.anonymous();
        }
        boolean liked = communityPostLikeRepositoryPort.exists(postId, viewerMemberId);
        return CommunityViewerLikes.of(liked ? Set.of(postId) : Set.of());
    }
}
