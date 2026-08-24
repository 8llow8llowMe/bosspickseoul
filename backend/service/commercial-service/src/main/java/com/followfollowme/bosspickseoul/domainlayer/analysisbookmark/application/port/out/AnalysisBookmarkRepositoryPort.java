package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.query.AnalysisBookmarkPageQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model.AnalysisBookmark;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import java.util.Optional;

public interface AnalysisBookmarkRepositoryPort {

    AnalysisBookmark save(AnalysisBookmark bookmark);

    Optional<AnalysisBookmark> findByMemberIdAndPayloadHash(long memberId, String payloadHash);

    long countByMemberId(long memberId);

    /** 소유자 조건을 포함해 삭제하고 삭제 건수를 돌려준다 (0 이면 미존재 또는 타인 항목). */
    int deleteByIdAndMemberId(long bookmarkId, long memberId);

    /** 소유자 조건을 포함해 이름을 수정하고 수정 건수를 돌려준다 (0 이면 미존재 또는 타인 항목). */
    int updateBookmarkName(long bookmarkId, long memberId, String bookmarkName);

    /**
     * 회원의 보관함을 최신순 페이지로 조회한다. shareType 이 null 이면 전체를 조회한다.
     * 페이징 구현(Pageable)은 어댑터 내부 세부사항으로 감춘다.
     */
    AnalysisBookmarkPageQueryResult findAllByMemberId(long memberId, ShareTargetType shareType, int page, int size);
}
