package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.MemberSummaryQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.MemberSummariesQueryResult.MemberSummaryQueryResult;
import java.util.Collection;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommunityWriterSummaryProcessor {

    private final MemberSummaryQueryPort memberSummaryQueryPort;

    /**
     * 작성자 표시용 회원 요약 조회. 작성자 닉네임/프로필은 목록·상세의 부가 정보라,
     * auth-service 통신 불가(503)를 전파해 화면 전체를 실패시키지 않고 빈 맵으로 강등한다
     * — 프레젠터는 맵에 없는 작성자의 표시 필드를 null 로 내리고, 프론트는 대체 문구를 쓴다.
     * (대상 검증(getTargetMeta)과 다른 정책인 이유: 그쪽은 쓰기 경로의 필수 검증이다)
     */
    public Map<Long, MemberSummaryQueryResult> getWriterSummaries(Collection<Long> memberIds) {
        if (memberIds == null || memberIds.isEmpty()) {
            return Map.of();
        }
        try {
            return memberSummaryQueryPort.findSummaries(memberIds);
        } catch (CommunityException exception) {
            log.warn("작성자 요약 조회 실패 — 작성자 표시를 생략하고 응답을 계속한다. code={}",
                exception.getErrorCode().getCode(), exception);
            return Map.of();
        }
    }
}
