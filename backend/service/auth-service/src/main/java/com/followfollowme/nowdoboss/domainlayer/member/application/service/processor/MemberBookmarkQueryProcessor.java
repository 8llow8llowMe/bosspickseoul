package com.followfollowme.nowdoboss.domainlayer.member.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.member.application.info.MemberBookmarkInfo;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.out.MemberBookmarkRepositoryPort;
import com.followfollowme.nowdoboss.persistence.dto.SliceResponse;
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
