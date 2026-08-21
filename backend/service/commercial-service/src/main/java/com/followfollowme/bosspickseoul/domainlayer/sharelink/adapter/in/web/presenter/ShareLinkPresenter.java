package com.followfollowme.bosspickseoul.domainlayer.sharelink.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.domainlayer.sharelink.adapter.in.web.dto.response.ShareLinkCreateResponse;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.adapter.in.web.dto.response.ShareLinkResolveResponse;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.info.ShareLinkResolveInfo;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.model.ShareLink;
import org.springframework.stereotype.Component;

@Component
public class ShareLinkPresenter {

    public ShareLinkCreateResponse toCreateResponse(ShareLink shareLink) {
        return ShareLinkCreateResponse.builder()
            .shareCode(shareLink.shareCode())
            .shareType(shareLink.shareType().toMetadata())
            .expiresAt(shareLink.expiresAt())
            .build();
    }

    public ShareLinkResolveResponse toResolveResponse(ShareLinkResolveInfo info) {
        return ShareLinkResolveResponse.builder()
            .shareType(info.shareType().toMetadata())
            .payload(info.payload())
            .createdAt(info.createdAt())
            .expiresAt(info.expiresAt())
            .build();
    }
}
