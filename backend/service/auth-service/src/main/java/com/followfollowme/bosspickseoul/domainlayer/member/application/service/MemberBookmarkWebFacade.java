package com.followfollowme.bosspickseoul.domainlayer.member.application.service;

import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberBookmarkCreateResponse;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberBookmarksResponse;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.presenter.MemberBookmarkPresenter;
import com.followfollowme.bosspickseoul.domainlayer.member.application.info.MemberBookmarkInfo;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.in.MemberBookmarkWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor.MemberBookmarkCommandProcessor;
import com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor.MemberBookmarkQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor.MemberQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberBookmarkTargetType;
import com.followfollowme.bosspickseoul.persistence.dto.SliceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberBookmarkWebFacade implements MemberBookmarkWebUseCase {

    private final MemberBookmarkCommandProcessor memberBookmarkCommandProcessor;
    private final MemberBookmarkQueryProcessor memberBookmarkQueryProcessor;
    private final MemberQueryProcessor memberQueryProcessor;
    private final MemberBookmarkPresenter memberBookmarkPresenter;

    @Override
    @Transactional
    public MemberBookmarkCreateResponse addBookmark(
        long memberId,
        MemberBookmarkTargetType targetType,
        String targetCode,
        String targetName
    ) {
        // 탈퇴/정지 회원의 만료 전 토큰 접근을 차단한다.
        memberQueryProcessor.getActiveMember(memberId);

        MemberBookmarkInfo info = memberBookmarkCommandProcessor.addBookmark(
            memberId, targetType, targetCode, targetName);
        return memberBookmarkPresenter.toCreateResponse(info);
    }

    @Override
    @Transactional
    public void removeBookmark(long memberId, long bookmarkId) {
        memberQueryProcessor.getActiveMember(memberId);
        memberBookmarkCommandProcessor.removeBookmark(bookmarkId, memberId);
    }

    @Override
    @Transactional(readOnly = true)
    public MemberBookmarksResponse getBookmarks(long memberId, Long lastBookmarkId, int size) {
        memberQueryProcessor.getActiveMember(memberId);
        SliceResponse<MemberBookmarkInfo> slice = memberBookmarkQueryProcessor.getBookmarks(
            memberId, lastBookmarkId, size);
        return memberBookmarkPresenter.toBookmarksResponse(slice);
    }
}
