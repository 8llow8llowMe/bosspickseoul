package com.followfollowme.bosspickseoul.domainlayer.sharelink.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.sharelink.adapter.in.web.dto.request.ShareLinkCreateRequest;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.adapter.in.web.dto.response.ShareLinkCreateResponse;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.adapter.in.web.dto.response.ShareLinkResolveResponse;

public interface ShareLinkWebUseCase {

    ShareLinkCreateResponse createShareLink(Long memberId, ShareLinkCreateRequest request);

    ShareLinkResolveResponse resolveShareLink(String shareCode);
}
