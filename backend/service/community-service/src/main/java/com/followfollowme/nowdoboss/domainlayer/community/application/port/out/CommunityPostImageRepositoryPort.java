package com.followfollowme.nowdoboss.domainlayer.community.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPostImage;
import java.util.List;
import java.util.Map;

public interface CommunityPostImageRepositoryPort {

    List<CommunityPostImage> findByPostId(long postId);

    /** 목록 화면 썸네일용. 게시글별 이미지를 한 번에 조회해 N+1 을 피한다. */
    Map<Long, List<CommunityPostImage>> findByPostIds(List<Long> postIds);

    List<CommunityPostImage> saveAll(List<CommunityPostImage> images);

    void deleteByPostId(long postId);
}
