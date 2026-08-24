package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkException;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.info.AnalysisBookmarkInfo;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.info.AnalysisBookmarkPageInfo;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.AnalysisBookmarkRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.query.AnalysisBookmarkPageQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model.AnalysisBookmark;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AnalysisBookmarkQueryProcessor {

    private final AnalysisBookmarkRepositoryPort analysisBookmarkRepositoryPort;

    /** shareTypeFilter 가 null/공백이면 전체, 값이 있으면 해당 화면 타입만 조회한다. */
    public AnalysisBookmarkPageInfo getBookmarks(long memberId, String shareTypeFilter, int page, int size) {
        ShareTargetType shareType = parseShareTypeFilter(shareTypeFilter);
        AnalysisBookmarkPageQueryResult bookmarks =
            analysisBookmarkRepositoryPort.findAllByMemberId(memberId, shareType, page, size);
        return AnalysisBookmarkPageInfo.builder()
            .bookmarks(bookmarks.bookmarks().stream().map(this::toInfo).toList())
            .page(bookmarks.page())
            .size(bookmarks.size())
            .totalElements(bookmarks.totalElements())
            .totalPages(bookmarks.totalPages())
            .build();
    }

    public AnalysisBookmarkInfo toInfo(AnalysisBookmark bookmark) {
        return AnalysisBookmarkInfo.builder()
            .bookmarkId(bookmark.id())
            .shareType(bookmark.shareType())
            .payload(bookmark.payload())
            .bookmarkName(bookmark.bookmarkName())
            .createdAt(bookmark.createdAt())
            .build();
    }

    private ShareTargetType parseShareTypeFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return ShareTargetType.parse(value)
            .orElseThrow(() -> new AnalysisBookmarkException(AnalysisBookmarkErrorCode.INVALID_SHARE_TARGET_TYPE));
    }
}
