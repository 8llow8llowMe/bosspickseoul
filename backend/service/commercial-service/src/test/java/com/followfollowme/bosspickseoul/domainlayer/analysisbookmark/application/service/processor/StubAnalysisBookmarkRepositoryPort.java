package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.AnalysisBookmarkRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.query.AnalysisBookmarkPageQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model.AnalysisBookmark;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** 프로세서 단위 테스트용 인메모리 스텁. 정렬(최신순)과 소유자 조건 시맨틱을 실제 어댑터와 동일하게 흉내낸다. */
class StubAnalysisBookmarkRepositoryPort implements AnalysisBookmarkRepositoryPort {

    private final Map<Long, AnalysisBookmark> rows = new LinkedHashMap<>();

    @Override
    public AnalysisBookmark save(AnalysisBookmark bookmark) {
        rows.put(bookmark.id(), bookmark);
        return bookmark;
    }

    @Override
    public Optional<AnalysisBookmark> findByMemberIdAndPayloadHash(long memberId, String payloadHash) {
        return rows.values().stream()
            .filter(row -> row.memberId() == memberId && row.payloadHash().equals(payloadHash))
            .findFirst();
    }

    @Override
    public long countByMemberId(long memberId) {
        return rows.values().stream().filter(row -> row.memberId() == memberId).count();
    }

    @Override
    public int deleteByIdAndMemberId(long bookmarkId, long memberId) {
        AnalysisBookmark row = rows.get(bookmarkId);
        if (row == null || row.memberId() != memberId) {
            return 0;
        }
        rows.remove(bookmarkId);
        return 1;
    }

    @Override
    public int updateBookmarkName(long bookmarkId, long memberId, String bookmarkName) {
        AnalysisBookmark row = rows.get(bookmarkId);
        if (row == null || row.memberId() != memberId) {
            return 0;
        }
        rows.put(bookmarkId, AnalysisBookmark.builder()
            .id(row.id())
            .memberId(row.memberId())
            .shareType(row.shareType())
            .payload(row.payload())
            .payloadHash(row.payloadHash())
            .bookmarkName(bookmarkName)
            .createdAt(row.createdAt())
            .build());
        return 1;
    }

    @Override
    public AnalysisBookmarkPageQueryResult findAllByMemberId(long memberId, ShareTargetType shareType, int page, int size) {
        List<AnalysisBookmark> filtered = rows.values().stream()
            .filter(row -> row.memberId() == memberId)
            .filter(row -> shareType == null || row.shareType() == shareType)
            .sorted(Comparator.comparing(AnalysisBookmark::createdAt).thenComparing(AnalysisBookmark::id).reversed())
            .toList();
        List<AnalysisBookmark> pageRows = filtered.stream().skip((long) page * size).limit(size).toList();
        return AnalysisBookmarkPageQueryResult.builder()
            .bookmarks(pageRows)
            .page(page)
            .size(size)
            .totalElements(filtered.size())
            .totalPages((int) Math.ceil((double) filtered.size() / size))
            .build();
    }

    int rowCount() {
        return rows.size();
    }

    String findNameById(long bookmarkId) {
        AnalysisBookmark row = rows.get(bookmarkId);
        return row == null ? null : row.bookmarkName();
    }
}
