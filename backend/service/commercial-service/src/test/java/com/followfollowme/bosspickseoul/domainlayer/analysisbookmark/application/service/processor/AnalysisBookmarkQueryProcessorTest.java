package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkException;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.info.AnalysisBookmarkPageInfo;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model.AnalysisBookmark;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class AnalysisBookmarkQueryProcessorTest {

    private final StubAnalysisBookmarkRepositoryPort repositoryPort = new StubAnalysisBookmarkRepositoryPort();
    private final AnalysisBookmarkQueryProcessor processor = new AnalysisBookmarkQueryProcessor(repositoryPort);

    @Test
    void getBookmarks_withoutFilter_returnsAllOwnBookmarksLatestFirst() {
        LocalDateTime base = LocalDateTime.of(2026, 8, 1, 12, 0);
        repositoryPort.save(bookmark(1L, 1L, ShareTargetType.COMMERCIAL_ANALYSIS, base));
        repositoryPort.save(bookmark(2L, 1L, ShareTargetType.AI_REPORT, base.plusMinutes(1)));
        repositoryPort.save(bookmark(3L, 2L, ShareTargetType.COMMERCIAL_ANALYSIS, base.plusMinutes(2)));

        AnalysisBookmarkPageInfo result = processor.getBookmarks(1L, null, 0, 10);

        assertThat(result.totalElements()).isEqualTo(2);
        assertThat(result.bookmarks()).extracting(info -> info.bookmarkId()).containsExactly(2L, 1L);
    }

    @Test
    void getBookmarks_withFilter_returnsOnlyMatchingShareType() {
        LocalDateTime base = LocalDateTime.of(2026, 8, 1, 12, 0);
        repositoryPort.save(bookmark(1L, 1L, ShareTargetType.COMMERCIAL_ANALYSIS, base));
        repositoryPort.save(bookmark(2L, 1L, ShareTargetType.AI_REPORT, base.plusMinutes(1)));

        AnalysisBookmarkPageInfo result = processor.getBookmarks(1L, "AI_REPORT", 0, 10);

        assertThat(result.totalElements()).isEqualTo(1);
        assertThat(result.bookmarks().getFirst().shareType()).isEqualTo(ShareTargetType.AI_REPORT);
    }

    @Test
    void getBookmarks_sameCreatedAt_breaksTieByIdDesc() {
        // createdAt 이 같아도 id(Snowflake, 시간순 유니크) 2차 정렬로 순서가 결정적이어야 한다
        LocalDateTime same = LocalDateTime.of(2026, 8, 1, 12, 0);
        repositoryPort.save(bookmark(10L, 1L, ShareTargetType.COMMERCIAL_ANALYSIS, same));
        repositoryPort.save(bookmark(20L, 1L, ShareTargetType.COMMERCIAL_ANALYSIS, same));

        AnalysisBookmarkPageInfo result = processor.getBookmarks(1L, null, 0, 10);

        assertThat(result.bookmarks()).extracting(info -> info.bookmarkId()).containsExactly(20L, 10L);
    }

    @Test
    void getBookmarks_rejectsUnknownShareTypeFilter() {
        assertThatThrownBy(() -> processor.getBookmarks(1L, "UNKNOWN_TYPE", 0, 10))
            .isInstanceOf(AnalysisBookmarkException.class)
            .extracting(exception -> ((AnalysisBookmarkException) exception).getErrorCode())
            .isEqualTo(AnalysisBookmarkErrorCode.INVALID_SHARE_TARGET_TYPE);
    }

    private AnalysisBookmark bookmark(long id, long memberId, ShareTargetType shareType, LocalDateTime createdAt) {
        return AnalysisBookmark.builder()
            .id(id)
            .memberId(memberId)
            .shareType(shareType)
            .payload("{\"code\":\"" + id + "\"}")
            .payloadHash("hash-" + shareType + "-" + id)
            .bookmarkName(null)
            .createdAt(createdAt)
            .build();
    }
}
