package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.request.AnalysisBookmarkCreateRequest;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.response.AnalysisBookmarkCreateResponse;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.response.AnalysisBookmarksResponse;

public interface AnalysisBookmarkWebUseCase {

    AnalysisBookmarkCreateResponse createBookmark(long memberId, AnalysisBookmarkCreateRequest request);

    AnalysisBookmarksResponse getBookmarks(long memberId, String shareType, int page, int size);

    void updateBookmarkName(long memberId, long bookmarkId, String bookmarkName);

    void deleteBookmark(long memberId, long bookmarkId);
}
