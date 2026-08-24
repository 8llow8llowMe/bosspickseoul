package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.service;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.request.AnalysisBookmarkCreateRequest;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.response.AnalysisBookmarkCreateResponse;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.response.AnalysisBookmarksResponse;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.presenter.AnalysisBookmarkPresenter;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.command.AnalysisBookmarkCreateCommand;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.in.AnalysisBookmarkWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.service.processor.AnalysisBookmarkCommandProcessor;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.service.processor.AnalysisBookmarkQueryProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnalysisBookmarkWebFacade implements AnalysisBookmarkWebUseCase {

    private final AnalysisBookmarkCommandProcessor analysisBookmarkCommandProcessor;
    private final AnalysisBookmarkQueryProcessor analysisBookmarkQueryProcessor;
    private final AnalysisBookmarkPresenter analysisBookmarkPresenter;

    @Override
    @Transactional
    public AnalysisBookmarkCreateResponse createBookmark(long memberId, AnalysisBookmarkCreateRequest request) {
        AnalysisBookmarkCreateCommand command = AnalysisBookmarkCreateCommand.builder()
            .shareType(request.shareType())
            .payload(request.payload())
            .bookmarkName(request.bookmarkName())
            .build();
        return analysisBookmarkPresenter.toCreateResponse(
            analysisBookmarkQueryProcessor.toInfo(analysisBookmarkCommandProcessor.create(memberId, command)));
    }

    @Override
    @Transactional(readOnly = true)
    public AnalysisBookmarksResponse getBookmarks(long memberId, String shareType, int page, int size) {
        return analysisBookmarkPresenter.toBookmarksResponse(
            analysisBookmarkQueryProcessor.getBookmarks(memberId, shareType, page, size));
    }

    @Override
    @Transactional
    public void updateBookmarkName(long memberId, long bookmarkId, String bookmarkName) {
        analysisBookmarkCommandProcessor.updateBookmarkName(memberId, bookmarkId, bookmarkName);
    }

    @Override
    @Transactional
    public void deleteBookmark(long memberId, long bookmarkId) {
        analysisBookmarkCommandProcessor.delete(memberId, bookmarkId);
    }
}
