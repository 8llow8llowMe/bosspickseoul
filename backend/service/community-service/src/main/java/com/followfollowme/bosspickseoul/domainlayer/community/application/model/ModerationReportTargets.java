package com.followfollowme.bosspickseoul.domainlayer.community.application.model;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import java.util.Map;

/**
 * 신고 목록에 붙일 대상 컨텐츠를 아이디로 찾아 쓸 수 있게 모아 둔 것.
 *
 * <p>이미 삭제된 대상은 키가 없다. 신고는 남아 있는데 대상만 사라지는 경우가 있어서,
 * 없는 것을 오류로 다루지 않고 "미리보기 없음"으로 표시한다.
 */
public record ModerationReportTargets(
    Map<Long, CommunityPost> postsById,
    Map<Long, CommunityComment> commentsById
) {

    public static ModerationReportTargets empty() {
        return new ModerationReportTargets(Map.of(), Map.of());
    }
}
