package com.followfollowme.bosspickseoul.domainlayer.member.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberBookmarkCreateResponse;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberBookmarksResponse;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberBookmarkTargetType;

public interface MemberBookmarkWebUseCase {

    MemberBookmarkCreateResponse addBookmark(
        long memberId,
        MemberBookmarkTargetType targetType,
        String targetCode,
        String targetName
    );

    void removeBookmark(long memberId, long bookmarkId);

    MemberBookmarksResponse getBookmarks(long memberId, Long lastBookmarkId, int size);
}
