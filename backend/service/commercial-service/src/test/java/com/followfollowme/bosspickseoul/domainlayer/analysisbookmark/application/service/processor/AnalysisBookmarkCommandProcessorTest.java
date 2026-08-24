package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.command.AnalysisBookmarkCreateCommand;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkDuplicateException;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkException;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.support.SharePayloadCanonicalizer;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model.AnalysisBookmark;
import com.followfollowme.bosspickseoul.global.properties.AnalysisBookmarkProperties;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import org.junit.jupiter.api.Test;

class AnalysisBookmarkCommandProcessorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final StubAnalysisBookmarkRepositoryPort repositoryPort = new StubAnalysisBookmarkRepositoryPort();
    private final AnalysisBookmarkCommandProcessor processor = new AnalysisBookmarkCommandProcessor(
        new SnowflakeIdGenerator(0, 0),
        repositoryPort,
        new SharePayloadCanonicalizer(objectMapper),
        new AnalysisBookmarkProperties(100)
    );

    @Test
    void create_storesCanonicalPayload() throws JsonProcessingException {
        AnalysisBookmark created = processor.create(1L, command("{\"b\": \"2\", \"a\": \"1\"}", "우리 동네 분석"));

        // key 순서가 달라도 같은 정규화 결과가 되도록 정렬 저장된다
        assertThat(created.payload()).isEqualTo("{\"a\":\"1\",\"b\":\"2\"}");
        assertThat(created.memberId()).isEqualTo(1L);
        assertThat(created.shareType()).isEqualTo(ShareTargetType.COMMERCIAL_ANALYSIS);
        assertThat(created.bookmarkName()).isEqualTo("우리 동네 분석");
        assertThat(repositoryPort.rowCount()).isEqualTo(1);
    }

    @Test
    void create_rejectsDuplicatePayloadWithExistingBookmarkId() throws JsonProcessingException {
        AnalysisBookmark first = processor.create(1L, command("{\"a\": \"1\", \"b\": \"2\"}", null));

        // key 순서가 달라도 같은 화면 상태로 판정하고, 기존 항목 아이디를 실어 던진다
        AnalysisBookmarkCreateCommand reordered = command("{\"b\": \"2\", \"a\": \"1\"}", null);
        assertThatThrownBy(() -> processor.create(1L, reordered))
            .isInstanceOf(AnalysisBookmarkDuplicateException.class)
            .satisfies(exception -> {
                AnalysisBookmarkDuplicateException duplicate = (AnalysisBookmarkDuplicateException) exception;
                assertThat(duplicate.getErrorCode()).isEqualTo(AnalysisBookmarkErrorCode.ALREADY_BOOKMARKED);
                assertThat(duplicate.getExistingBookmarkId()).isEqualTo(first.id());
            });
        assertThat(repositoryPort.rowCount()).isEqualTo(1);
    }

    @Test
    void create_allowsSamePayloadForDifferentMembers() throws JsonProcessingException {
        AnalysisBookmark first = processor.create(1L, command("{\"code\": \"1\"}", null));
        AnalysisBookmark second = processor.create(2L, command("{\"code\": \"1\"}", null));

        // 공유 링크와 달리 회원 소유 모델이므로 회원별로 별도 행이 생긴다
        assertThat(second.id()).isNotEqualTo(first.id());
        assertThat(repositoryPort.rowCount()).isEqualTo(2);
    }

    @Test
    void create_allowsSamePayloadForDifferentShareTypes() throws JsonProcessingException {
        processor.create(1L, command("{\"code\": \"1\"}", null));
        processor.create(1L, new AnalysisBookmarkCreateCommand(
            "AI_REPORT", objectMapper.readTree("{\"code\": \"1\"}"), null));

        assertThat(repositoryPort.rowCount()).isEqualTo(2);
    }

    @Test
    void create_acceptsLowerCaseShareType() throws JsonProcessingException {
        AnalysisBookmark created = processor.create(1L, new AnalysisBookmarkCreateCommand(
            "commercial_analysis", objectMapper.readTree("{\"code\": \"1\"}"), null));

        assertThat(created.shareType()).isEqualTo(ShareTargetType.COMMERCIAL_ANALYSIS);
    }

    @Test
    void create_normalizesBlankBookmarkNameToNull() throws JsonProcessingException {
        AnalysisBookmark created = processor.create(1L, command("{\"code\": \"1\"}", "   "));

        assertThat(created.bookmarkName()).isNull();
    }

    @Test
    void create_rejectsWhenBookmarkLimitExceeded() throws JsonProcessingException {
        AnalysisBookmarkCommandProcessor limitedProcessor = new AnalysisBookmarkCommandProcessor(
            new SnowflakeIdGenerator(0, 0),
            repositoryPort,
            new SharePayloadCanonicalizer(objectMapper),
            new AnalysisBookmarkProperties(1)
        );
        limitedProcessor.create(1L, command("{\"code\": \"1\"}", null));

        AnalysisBookmarkCreateCommand another = command("{\"code\": \"2\"}", null);
        assertThatThrownBy(() -> limitedProcessor.create(1L, another))
            .isInstanceOf(AnalysisBookmarkException.class)
            .extracting(exception -> ((AnalysisBookmarkException) exception).getErrorCode())
            .isEqualTo(AnalysisBookmarkErrorCode.BOOKMARK_LIMIT_EXCEEDED);
        assertThat(repositoryPort.rowCount()).isEqualTo(1);
    }

    @Test
    void create_rejectsUnknownShareType() throws JsonProcessingException {
        AnalysisBookmarkCreateCommand invalid = new AnalysisBookmarkCreateCommand(
            "UNKNOWN_TYPE", objectMapper.readTree("{}"), null);

        assertThatThrownBy(() -> processor.create(1L, invalid))
            .isInstanceOf(AnalysisBookmarkException.class)
            .extracting(exception -> ((AnalysisBookmarkException) exception).getErrorCode())
            .isEqualTo(AnalysisBookmarkErrorCode.INVALID_SHARE_TARGET_TYPE);
    }

    @Test
    void create_rejectsNonObjectPayload() throws JsonProcessingException {
        AnalysisBookmarkCreateCommand arrayPayload = new AnalysisBookmarkCreateCommand(
            "COMMERCIAL_ANALYSIS", objectMapper.readTree("[1, 2]"), null);

        assertThatThrownBy(() -> processor.create(1L, arrayPayload))
            .isInstanceOf(AnalysisBookmarkException.class)
            .extracting(exception -> ((AnalysisBookmarkException) exception).getErrorCode())
            .isEqualTo(AnalysisBookmarkErrorCode.PAYLOAD_NOT_OBJECT);
    }

    @Test
    void create_rejectsOversizedPayload() throws JsonProcessingException {
        String bigValue = "x".repeat(2100);
        AnalysisBookmarkCreateCommand oversized = command("{\"big\": \"" + bigValue + "\"}", null);

        assertThatThrownBy(() -> processor.create(1L, oversized))
            .isInstanceOf(AnalysisBookmarkException.class)
            .extracting(exception -> ((AnalysisBookmarkException) exception).getErrorCode())
            .isEqualTo(AnalysisBookmarkErrorCode.PAYLOAD_TOO_LARGE);
    }

    @Test
    void updateBookmarkName_updatesOwnBookmark() throws JsonProcessingException {
        AnalysisBookmark created = processor.create(1L, command("{\"code\": \"1\"}", null));

        processor.updateBookmarkName(1L, created.id(), "새 이름");

        assertThat(repositoryPort.findNameById(created.id())).isEqualTo("새 이름");
    }

    @Test
    void updateBookmarkName_clearsNameWhenBlank() throws JsonProcessingException {
        AnalysisBookmark created = processor.create(1L, command("{\"code\": \"1\"}", "원래 이름"));

        processor.updateBookmarkName(1L, created.id(), "   ");

        assertThat(repositoryPort.findNameById(created.id())).isNull();
    }

    @Test
    void updateBookmarkName_rejectsOtherMembersBookmarkAsNotFound() throws JsonProcessingException {
        AnalysisBookmark created = processor.create(1L, command("{\"code\": \"1\"}", null));

        assertThatThrownBy(() -> processor.updateBookmarkName(2L, created.id(), "새 이름"))
            .isInstanceOf(AnalysisBookmarkException.class)
            .extracting(exception -> ((AnalysisBookmarkException) exception).getErrorCode())
            .isEqualTo(AnalysisBookmarkErrorCode.BOOKMARK_NOT_FOUND);
    }

    @Test
    void delete_removesOwnBookmark() throws JsonProcessingException {
        AnalysisBookmark created = processor.create(1L, command("{\"code\": \"1\"}", null));

        processor.delete(1L, created.id());

        assertThat(repositoryPort.rowCount()).isZero();
    }

    @Test
    void delete_rejectsOtherMembersBookmarkAsNotFound() throws JsonProcessingException {
        AnalysisBookmark created = processor.create(1L, command("{\"code\": \"1\"}", null));

        // 타인 항목은 존재 여부를 노출하지 않도록 동일하게 404 로 응답한다
        assertThatThrownBy(() -> processor.delete(2L, created.id()))
            .isInstanceOf(AnalysisBookmarkException.class)
            .extracting(exception -> ((AnalysisBookmarkException) exception).getErrorCode())
            .isEqualTo(AnalysisBookmarkErrorCode.BOOKMARK_NOT_FOUND);
        assertThat(repositoryPort.rowCount()).isEqualTo(1);
    }

    @Test
    void delete_rejectsMissingBookmarkAsNotFound() {
        assertThatThrownBy(() -> processor.delete(1L, 999L))
            .isInstanceOf(AnalysisBookmarkException.class)
            .extracting(exception -> ((AnalysisBookmarkException) exception).getErrorCode())
            .isEqualTo(AnalysisBookmarkErrorCode.BOOKMARK_NOT_FOUND);
    }

    private AnalysisBookmarkCreateCommand command(String payloadJson, String bookmarkName) throws JsonProcessingException {
        return new AnalysisBookmarkCreateCommand(
            ShareTargetType.COMMERCIAL_ANALYSIS.name(), objectMapper.readTree(payloadJson), bookmarkName);
    }
}
