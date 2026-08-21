package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityBoardPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityFeedCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityLikedPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunitySearchPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.LikedCommunityPost;
import java.util.Optional;
import org.springframework.data.domain.Slice;

public interface CommunityPostRepositoryPort {

    Slice<CommunityPost> getBoardPosts(CommunityBoardPostCriteria criteria);

    Slice<CommunityPost> getFeedPosts(CommunityFeedCriteria criteria);

    Slice<LikedCommunityPost> getLikedPosts(CommunityLikedPostCriteria criteria);

    Slice<CommunityPost> searchPosts(CommunitySearchPostCriteria criteria);

    Optional<CommunityPost> findById(long postId);

    CommunityPost save(CommunityPost post);
}