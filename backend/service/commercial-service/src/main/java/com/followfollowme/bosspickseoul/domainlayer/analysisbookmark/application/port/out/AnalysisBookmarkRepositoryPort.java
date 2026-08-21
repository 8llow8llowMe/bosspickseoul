package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.query.AnalysisBookmarkPageQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model.AnalysisBookmark;
import java.util.Optional;

public interface AnalysisBookmarkRepositoryPort {

    AnalysisBookmark save(AnalysisBookmark bookmark);

    boolean existsByMemberIdAndPayloadHash(long memberId, String payloadHash);

    Optional<AnalysisBookmark> findById(long bookmarkId);

    void deleteById(long bookmarkId);

    /**
     * 회원의 보관함을 최신순 페이지로 조회한다. 페이징 구현(Pageable)은 어댑터 내부 세부사항으로 감춘다.
     */
    AnalysisBookmarkPageQueryResult findAllByMemberId(long memberId, int page, int size);
}
