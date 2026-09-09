package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.MemberSummariesQueryResult.MemberSummaryQueryResult;
import java.util.Collection;
import java.util.Map;

public interface MemberSummaryQueryPort {

    /**
     * 작성자 표시용 회원 요약 일괄 조회. 존재하는 회원만 키로 담기며, 미존재 ID 는 키가 없다.
     * auth-service 통신 불가 시 MEMBER_SERVICE_UNAVAILABLE(503) 예외를 던진다 — 강등 여부는 호출 쪽 정책이다.
     */
    Map<Long, MemberSummaryQueryResult> findSummaries(Collection<Long> memberIds);
}
