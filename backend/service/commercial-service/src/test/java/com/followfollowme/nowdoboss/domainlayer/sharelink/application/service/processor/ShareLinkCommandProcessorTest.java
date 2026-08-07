package com.followfollowme.nowdoboss.domainlayer.sharelink.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.command.ShareLinkCreateCommand;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.exception.ShareLinkErrorCode;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.exception.ShareLinkException;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.port.out.ShareLinkRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.sharelink.domain.enums.ShareTargetType;
import com.followfollowme.nowdoboss.domainlayer.sharelink.domain.model.ShareLink;
import com.followfollowme.nowdoboss.global.properties.ShareLinkProperties;
import com.followfollowme.nowdoboss.persistence.util.SnowflakeIdGenerator;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ShareLinkCommandProcessorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final StubShareLinkRepositoryPort repositoryPort = new StubShareLinkRepositoryPort();
    private final ShareLinkCommandProcessor processor = new ShareLinkCommandProcessor(
        new SnowflakeIdGenerator(0, 0),
        repositoryPort,
        new ShareLinkProperties(90),
        objectMapper
    );

    @Test
    void createShareLink_issuesBase62CodeAndCanonicalPayload() throws JsonProcessingException {
        ShareLink created = processor.createShareLink(1L, command("{\"b\": \"2\", \"a\": \"1\"}"));

        assertThat(created.shareCode()).matches("[0-9A-Za-z]{8}");
        // key 순서가 달라도 같은 정규화 결과가 되도록 정렬 저장된다
        assertThat(created.payload()).isEqualTo("{\"a\":\"1\",\"b\":\"2\"}");
        assertThat(created.memberId()).isEqualTo(1L);
        assertThat(created.expiresAt()).isAfter(LocalDateTime.now().plusDays(89));
    }

    @Test
    void createShareLink_reusesExistingCodeForSamePayloadRegardlessOfKeyOrder() throws JsonProcessingException {
        ShareLink first = processor.createShareLink(1L, command("{\"a\": \"1\", \"b\": \"2\"}"));
        ShareLink second = processor.createShareLink(2L, command("{\"b\": \"2\", \"a\": \"1\"}"));

        assertThat(second.shareCode()).isEqualTo(first.shareCode());
        assertThat(second.id()).isEqualTo(first.id());
        // 최초 공유자 기록은 유지된다
        assertThat(second.memberId()).isEqualTo(1L);
        assertThat(repositoryPort.rowCount()).isEqualTo(1);
    }

    @Test
    void createShareLink_createsSeparateLinksForDifferentShareTypes() throws JsonProcessingException {
        ShareLink commercial = processor.createShareLink(1L, command("{\"code\": \"1\"}"));
        ShareLink aiReport = processor.createShareLink(1L,
            new ShareLinkCreateCommand("AI_REPORT", objectMapper.readTree("{\"code\": \"1\"}")));

        assertThat(commercial.shareCode()).isNotEqualTo(aiReport.shareCode());
        assertThat(repositoryPort.rowCount()).isEqualTo(2);
    }

    @Test
    void createShareLink_rejectsUnknownShareType() throws JsonProcessingException {
        ShareLinkCreateCommand invalid = new ShareLinkCreateCommand("UNKNOWN_TYPE", objectMapper.readTree("{}"));

        assertThatThrownBy(() -> processor.createShareLink(1L, invalid))
            .isInstanceOf(ShareLinkException.class)
            .extracting(exception -> ((ShareLinkException) exception).getErrorCode())
            .isEqualTo(ShareLinkErrorCode.INVALID_SHARE_TARGET_TYPE);
    }

    @Test
    void createShareLink_rejectsNonObjectPayload() throws JsonProcessingException {
        ShareLinkCreateCommand arrayPayload = new ShareLinkCreateCommand("COMMERCIAL_ANALYSIS", objectMapper.readTree("[1, 2]"));

        assertThatThrownBy(() -> processor.createShareLink(1L, arrayPayload))
            .isInstanceOf(ShareLinkException.class)
            .extracting(exception -> ((ShareLinkException) exception).getErrorCode())
            .isEqualTo(ShareLinkErrorCode.PAYLOAD_NOT_OBJECT);
    }

    @Test
    void createShareLink_rejectsOversizedPayload() throws JsonProcessingException {
        String bigValue = "x".repeat(2100);
        ShareLinkCreateCommand oversized = command("{\"big\": \"" + bigValue + "\"}");

        assertThatThrownBy(() -> processor.createShareLink(1L, oversized))
            .isInstanceOf(ShareLinkException.class)
            .extracting(exception -> ((ShareLinkException) exception).getErrorCode())
            .isEqualTo(ShareLinkErrorCode.PAYLOAD_TOO_LARGE);
    }

    private ShareLinkCreateCommand command(String payloadJson) throws JsonProcessingException {
        return new ShareLinkCreateCommand(ShareTargetType.COMMERCIAL_ANALYSIS.name(), objectMapper.readTree(payloadJson));
    }

    private static class StubShareLinkRepositoryPort implements ShareLinkRepositoryPort {

        private final Map<Long, ShareLink> rows = new HashMap<>();

        @Override
        public Optional<ShareLink> findByShareCode(String shareCode) {
            return rows.values().stream().filter(row -> row.shareCode().equals(shareCode)).findFirst();
        }

        @Override
        public Optional<ShareLink> findByPayloadHash(String payloadHash) {
            return rows.values().stream().filter(row -> row.payloadHash().equals(payloadHash)).findFirst();
        }

        @Override
        public boolean existsByShareCode(String shareCode) {
            return findByShareCode(shareCode).isPresent();
        }

        @Override
        public ShareLink save(ShareLink shareLink) {
            rows.put(shareLink.id(), shareLink);
            return shareLink;
        }

        int rowCount() {
            return rows.size();
        }
    }
}
