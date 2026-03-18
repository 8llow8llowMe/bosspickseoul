package com.followfollowme.nowdoboss.domainlayer.community.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.community.application.model.CommunityBoardPostCriteria;
import com.followfollowme.nowdoboss.domainlayer.community.application.model.CommunityFeedCriteria;
import com.followfollowme.nowdoboss.domainlayer.community.application.model.CommunityLikedPostCriteria;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.LikedCommunityPost;
import java.util.Optional;
import org.springframework.data.domain.Slice;

public interface CommunityPostPort {

    Slice<CommunityPost> getBoardPosts(CommunityBoardPostCriteria criteria);

    Slice<CommunityPost> getFeedPosts(CommunityFeedCriteria criteria);

    Slice<LikedCommunityPost> getLikedPosts(CommunityLikedPostCriteria criteria);

    Optional<CommunityPost> findById(long postId);

    CommunityPost save(CommunityPost post);
}