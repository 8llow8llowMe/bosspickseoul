package com.followfollowme.nowdoboss.domainlayer.member.application.service;

import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response.MemberBookmarkCreateResponse;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response.MemberBookmarksResponse;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.presenter.MemberBookmarkPresenter;
import com.followfollowme.nowdoboss.domainlayer.member.application.info.MemberBookmarkInfo;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.in.MemberBookmarkWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.member.application.service.processor.MemberBookmarkCommandProcessor;
import com.followfollowme.nowdoboss.domainlayer.member.application.service.processor.MemberBookmarkQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.MemberBookmarkTargetType;
import com.followfollowme.nowdoboss.persistence.dto.SliceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberBookmarkWebFacade implements MemberBookmarkWebUseCase {

    private final MemberBookmarkCommandProcessor memberBookmarkCommandProcessor;
    private final MemberBookmarkQueryProcessor memberBookmarkQueryProcessor;
    private final MemberBookmarkPresenter memberBookmarkPresenter;

    @Override
    @Transactional
    public MemberBookmarkCreateResponse addBookmark(
        long memberId,
        MemberBookmarkTargetType targetType,
        String targetCode,
        String targetName
    ) {
        MemberBookmarkInfo info = memberBookmarkCommandProcessor.addBookmark(
            memberId, targetType, targetCode, targetName);
        return memberBookmarkPresenter.toCreateResponse(info);
    }

    @Override
    @Transactional
    public void removeBookmark(long memberId, long bookmarkId) {
        memberBookmarkCommandProcessor.removeBookmark(bookmarkId, memberId);
    }

    @Override
    @Transactional(readOnly = true)
    public MemberBookmarksResponse getBookmarks(long memberId, Long lastBookmarkId, int size) {
        SliceResponse<MemberBookmarkInfo> slice = memberBookmarkQueryProcessor.getBookmarks(
            memberId, lastBookmarkId, size);
        return memberBookmarkPresenter.toBookmarksResponse(slice);
    }
}
