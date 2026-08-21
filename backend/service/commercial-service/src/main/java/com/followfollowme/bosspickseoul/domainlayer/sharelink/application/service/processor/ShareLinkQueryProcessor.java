package com.followfollowme.bosspickseoul.domainlayer.sharelink.application.service.processor;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.exception.ShareLinkErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.exception.ShareLinkException;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.info.ShareLinkResolveInfo;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.port.out.ShareLinkRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.model.ShareLink;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ShareLinkQueryProcessor {

    private final ShareLinkRepositoryPort shareLinkRepositoryPort;
    private final ObjectMapper objectMapper;

    public ShareLinkResolveInfo getShareLink(String shareCode) {
        ShareLink shareLink = shareLinkRepositoryPort.findByShareCode(shareCode)
            .orElseThrow(() -> new ShareLinkException(ShareLinkErrorCode.SHARE_LINK_NOT_FOUND));

        if (shareLink.expiresAt().isBefore(LocalDateTime.now())) {
            throw new ShareLinkException(ShareLinkErrorCode.SHARE_LINK_EXPIRED);
        }

        return new ShareLinkResolveInfo(
            shareLink.shareType(),
            parsePayload(shareLink.payload()),
            shareLink.createdAt(),
            shareLink.expiresAt()
        );
    }

    private JsonNode parsePayload(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (JsonProcessingException exception) {
            // 저장 시 정규화를 거치므로 정상 경로에서는 도달하지 않는다. 데이터 오염 방어용.
            throw new ShareLinkException(ShareLinkErrorCode.SHARE_LINK_NOT_FOUND);
        }
    }
}
