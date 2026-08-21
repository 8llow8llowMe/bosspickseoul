package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.command.AnalysisBookmarkCreateCommand;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkException;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.AnalysisBookmarkRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.query.AnalysisBookmarkPageQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model.AnalysisBookmark;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class AnalysisBookmarkCommandProcessorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final StubAnalysisBookmarkRepositoryPort repositoryPort = new StubAnalysisBookmarkRepositoryPort();
    private final AnalysisBookmarkCommandProcessor processor = new AnalysisBookmarkCommandProcessor(
        new SnowflakeIdGenerator(0, 0),
        repositoryPort,
        objectMapper
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
    void create_rejectsDuplicatePayloadRegardlessOfKeyOrder() throws JsonProcessingException {
        processor.create(1L, command("{\"a\": \"1\", \"b\": \"2\"}", null));

        AnalysisBookmarkCreateCommand reordered = command("{\"b\": \"2\", \"a\": \"1\"}", null);
        assertThatThrownBy(() -> processor.create(1L, reordered))
            .isInstanceOf(AnalysisBookmarkException.class)
            .extracting(exception -> ((AnalysisBookmarkException) exception).getErrorCode())
            .isEqualTo(AnalysisBookmarkErrorCode.ALREADY_BOOKMARKED);
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
    void create_normalizesBlankBookmarkNameToNull() throws JsonProcessingException {
        AnalysisBookmark created = processor.create(1L, command("{\"code\": \"1\"}", "   "));

        assertThat(created.bookmarkName()).isNull();
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
    void delete_removesOwnBookmark() throws JsonProcessingException {
        AnalysisBookmark created = processor.create(1L, command("{\"code\": \"1\"}", null));

        processor.delete(1L, created.id());

        assertThat(repositoryPort.rowCount()).isZero();
    }

    @Test
    void delete_rejectsOtherMembersBookmarkAsNotFound() throws JsonProcessingException {
        AnalysisBookmark created = processor.create(1L, command("{\"code\": \"1\"}", null));

        // 타인 항목은 존재 여부를 노출하지 않도록 404 로 응답한다
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

    private static class StubAnalysisBookmarkRepositoryPort implements AnalysisBookmarkRepositoryPort {

        private final Map<Long, AnalysisBookmark> rows = new HashMap<>();

        @Override
        public AnalysisBookmark save(AnalysisBookmark bookmark) {
            rows.put(bookmark.id(), bookmark);
            return bookmark;
        }

        @Override
        public boolean existsByMemberIdAndPayloadHash(long memberId, String payloadHash) {
            return rows.values().stream()
                .anyMatch(row -> row.memberId() == memberId && row.payloadHash().equals(payloadHash));
        }

        @Override
        public Optional<AnalysisBookmark> findById(long bookmarkId) {
            return Optional.ofNullable(rows.get(bookmarkId));
        }

        @Override
        public void deleteById(long bookmarkId) {
            rows.remove(bookmarkId);
        }

        @Override
        public AnalysisBookmarkPageQueryResult findAllByMemberId(long memberId, int page, int size) {
            throw new UnsupportedOperationException("커맨드 프로세서 테스트에서는 사용하지 않는다.");
        }

        int rowCount() {
            return rows.size();
        }
    }
}
