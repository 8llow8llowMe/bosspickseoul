package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityBoardPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityFeedCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityLikedPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunitySearchPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostCategory;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.LikedCommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.SliceQueryResult;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.OptionalLong;
import java.time.LocalDateTime;

public interface CommunityPostRepositoryPort {

    SliceQueryResult<CommunityPost> getBoardPosts(CommunityBoardPostCriteria criteria);

    SliceQueryResult<CommunityPost> getFeedPosts(CommunityFeedCriteria criteria);

    SliceQueryResult<LikedCommunityPost> getLikedPosts(CommunityLikedPostCriteria criteria);

    SliceQueryResult<CommunityPost> searchPosts(CommunitySearchPostCriteria criteria);

    Optional<CommunityPost> findById(long postId);

    /** in 절 벌킬 조회. 목록 화면에서 건당 단건 조회를 도는 N+1 을 막는다. */
    List<CommunityPost> findAllByIds(Collection<Long> postIds);

    CommunityPost save(CommunityPost post);

    /**
     * 본문 수정 조건부 UPDATE. 제목·본문·말머리만 바꾸고 카운터는 건드리지 않는다. {@code category} 가 null 이면 말머리를 지운다(전체 교체).
     * ACTIVE 가 아니거나 작성자가 다르면 갱신 0건이라 빈 값이다.
     */
    Optional<CommunityPost> updateContentIfActive(
        long postId, long memberId, String title, String content, CommunityPostCategory category, LocalDateTime updatedAt);

    boolean deleteIfActive(long postId);

    Optional<CommunityPost> incrementViewCountIfActive(long postId);

    OptionalLong incrementLikeCountIfActive(long postId);

    OptionalLong decrementLikeCountIfActive(long postId);

    OptionalLong incrementCommentCountIfActive(long postId);

    OptionalLong decrementCommentCountIfActive(long postId);
}
