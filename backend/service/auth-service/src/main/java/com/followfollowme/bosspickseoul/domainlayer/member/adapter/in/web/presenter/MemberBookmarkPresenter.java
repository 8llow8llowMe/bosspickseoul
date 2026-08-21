package com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.item.MemberBookmarkItem;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberBookmarkCreateResponse;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberBookmarksResponse;
import com.followfollowme.bosspickseoul.domainlayer.member.application.info.MemberBookmarkInfo;
import com.followfollowme.bosspickseoul.persistence.dto.SliceResponse;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class MemberBookmarkPresenter {

    public MemberBookmarkCreateResponse toCreateResponse(MemberBookmarkInfo info) {
        return MemberBookmarkCreateResponse.builder()
            .bookmarkId(info.id())
            .targetType(info.targetType())
            .targetCode(info.targetCode())
            .targetName(info.targetName())
            .createdAt(info.createdAt())
            .build();
    }

    public MemberBookmarksResponse toBookmarksResponse(SliceResponse<MemberBookmarkInfo> slice) {
        List<MemberBookmarkItem> items = slice.contents().stream()
            .map(this::toBookmarkItem)
            .toList();
        return MemberBookmarksResponse.builder()
            .bookmarks(new SliceResponse<>(items, slice.hasNext()))
            .build();
    }

    private MemberBookmarkItem toBookmarkItem(MemberBookmarkInfo info) {
        return MemberBookmarkItem.builder()
            .bookmarkId(info.id())
            .targetType(info.targetType())
            .targetCode(info.targetCode())
            .targetName(info.targetName())
            .createdAt(info.createdAt())
            .build();
    }
}
