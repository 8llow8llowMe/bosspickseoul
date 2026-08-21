package com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.member.application.info.MemberBookmarkInfo;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberBookmarkRepositoryPort;
import com.followfollowme.bosspickseoul.persistence.dto.SliceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MemberBookmarkQueryProcessor {

    private final MemberBookmarkRepositoryPort memberBookmarkRepositoryPort;

    public SliceResponse<MemberBookmarkInfo> getBookmarks(long memberId, Long lastBookmarkId, int size) {
        return memberBookmarkRepositoryPort.findBookmarks(memberId, lastBookmarkId, size);
    }
}
