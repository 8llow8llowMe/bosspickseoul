package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityBoardPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityFeedCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityLikedPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunitySearchPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.LikedCommunityPost;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Slice;

public interface CommunityPostRepositoryPort {

    Slice<CommunityPost> getBoardPosts(CommunityBoardPostCriteria criteria);

    Slice<CommunityPost> getFeedPosts(CommunityFeedCriteria criteria);

    Slice<LikedCommunityPost> getLikedPosts(CommunityLikedPostCriteria criteria);

    Slice<CommunityPost> searchPosts(CommunitySearchPostCriteria criteria);

    Optional<CommunityPost> findById(long postId);

    /** in 절 벌킬 조회. 목록 화면에서 건당 단건 조회를 도는 N+1 을 막는다. */
    List<CommunityPost> findAllByIds(Collection<Long> postIds);

    CommunityPost save(CommunityPost post);
}