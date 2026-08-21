package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.info.AnalysisBookmarkInfo;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.info.AnalysisBookmarkPageInfo;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.AnalysisBookmarkRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.query.AnalysisBookmarkPageQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model.AnalysisBookmark;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AnalysisBookmarkQueryProcessor {

    private final AnalysisBookmarkRepositoryPort analysisBookmarkRepositoryPort;

    public AnalysisBookmarkPageInfo getBookmarks(long memberId, int page, int size) {
        AnalysisBookmarkPageQueryResult bookmarks =
            analysisBookmarkRepositoryPort.findAllByMemberId(memberId, page, size);
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
}
