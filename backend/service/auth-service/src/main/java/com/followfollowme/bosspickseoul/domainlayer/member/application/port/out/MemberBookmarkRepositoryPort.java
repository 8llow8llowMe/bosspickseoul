package com.followfollowme.bosspickseoul.domainlayer.member.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.member.application.info.MemberBookmarkInfo;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberBookmarkTargetType;
import com.followfollowme.bosspickseoul.persistence.dto.SliceResponse;

public interface MemberBookmarkRepositoryPort {

    boolean existsByMemberIdAndTargetTypeAndTargetCode(
        long memberId, MemberBookmarkTargetType targetType, String targetCode);

    MemberBookmarkInfo save(MemberBookmarkInfo info);

    boolean existsByIdAndMemberId(long bookmarkId, long memberId);

    void deleteByIdAndMemberId(long bookmarkId, long memberId);

    SliceResponse<MemberBookmarkInfo> findBookmarks(long memberId, Long lastBookmarkId, int size);
}
