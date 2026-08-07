package com.followfollowme.nowdoboss.domainlayer.sharelink.application.service;

import com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.in.web.dto.request.ShareLinkCreateRequest;
import com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.in.web.dto.response.ShareLinkCreateResponse;
import com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.in.web.dto.response.ShareLinkResolveResponse;
import com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.in.web.presenter.ShareLinkPresenter;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.command.ShareLinkCreateCommand;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.port.in.ShareLinkWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.service.processor.ShareLinkCommandProcessor;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.service.processor.ShareLinkQueryProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ShareLinkWebFacade implements ShareLinkWebUseCase {

    private final ShareLinkCommandProcessor shareLinkCommandProcessor;
    private final ShareLinkQueryProcessor shareLinkQueryProcessor;
    private final ShareLinkPresenter shareLinkPresenter;

    @Override
    public ShareLinkCreateResponse createShareLink(long memberId, ShareLinkCreateRequest request) {
        ShareLinkCreateCommand command = new ShareLinkCreateCommand(request.shareType(), request.payload());
        return shareLinkPresenter.toCreateResponse(shareLinkCommandProcessor.createShareLink(memberId, command));
    }

    @Override
    @Transactional(readOnly = true)
    public ShareLinkResolveResponse resolveShareLink(String shareCode) {
        return shareLinkPresenter.toResolveResponse(shareLinkQueryProcessor.getShareLink(shareCode));
    }
}
