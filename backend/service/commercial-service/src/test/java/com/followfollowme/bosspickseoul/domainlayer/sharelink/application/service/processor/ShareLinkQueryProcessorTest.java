package com.followfollowme.bosspickseoul.domainlayer.sharelink.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.exception.ShareLinkErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.exception.ShareLinkException;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.info.ShareLinkResolveInfo;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.port.out.ShareLinkRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.model.ShareLink;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ShareLinkQueryProcessorTest {

    private static final String PAYLOAD = "{\"commercialCode\":\"3110008\"}";

    @Test
    void getShareLink_returnsParsedPayload() {
        ShareLinkQueryProcessor processor = processorWith(shareLink(LocalDateTime.now().plusDays(1)));

        ShareLinkResolveInfo info = processor.getShareLink("a1B2c3D4");

        assertThat(info.shareType()).isEqualTo(ShareTargetType.COMMERCIAL_ANALYSIS);
        assertThat(info.payload().get("commercialCode").asText()).isEqualTo("3110008");
    }

    @Test
    void getShareLink_rejectsUnknownCode() {
        ShareLinkQueryProcessor processor = processorWith(null);

        assertThatThrownBy(() -> processor.getShareLink("missing1"))
            .isInstanceOf(ShareLinkException.class)
            .extracting(exception -> ((ShareLinkException) exception).getErrorCode())
            .isEqualTo(ShareLinkErrorCode.SHARE_LINK_NOT_FOUND);
    }

    @Test
    void getShareLink_rejectsExpiredLink() {
        ShareLinkQueryProcessor processor = processorWith(shareLink(LocalDateTime.now().minusMinutes(1)));

        assertThatThrownBy(() -> processor.getShareLink("a1B2c3D4"))
            .isInstanceOf(ShareLinkException.class)
            .extracting(exception -> ((ShareLinkException) exception).getErrorCode())
            .isEqualTo(ShareLinkErrorCode.SHARE_LINK_EXPIRED);
    }

    private ShareLinkQueryProcessor processorWith(ShareLink shareLink) {
        return new ShareLinkQueryProcessor(new StubShareLinkRepositoryPort(shareLink), new ObjectMapper());
    }

    private ShareLink shareLink(LocalDateTime expiresAt) {
        LocalDateTime now = LocalDateTime.now();
        return new ShareLink(1L, "a1B2c3D4", ShareTargetType.COMMERCIAL_ANALYSIS, PAYLOAD, "hash", 1L, expiresAt, now, now);
    }

    private record StubShareLinkRepositoryPort(ShareLink shareLink) implements ShareLinkRepositoryPort {

        @Override
        public Optional<ShareLink> findByShareCode(String shareCode) {
            return Optional.ofNullable(shareLink).filter(row -> row.shareCode().equals(shareCode));
        }

        @Override
        public Optional<ShareLink> findByPayloadHash(String payloadHash) {
            return Optional.empty();
        }

        @Override
        public boolean existsByShareCode(String shareCode) {
            return false;
        }

        @Override
        public int deleteExpiredBefore(java.time.LocalDateTime threshold, int limit) {
            return 0;
        }

        @Override
        public ShareLink save(ShareLink toSave) {
            return toSave;
        }
    }
}
