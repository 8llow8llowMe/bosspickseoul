package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.MemberSummaryQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.MemberSummariesQueryResult.MemberSummaryQueryResult;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CommunityWriterSummaryProcessorTest {

    @Test
    void getWriterSummaries_authServiceDown_degradesToEmptyInsteadOfFailing() {
        // 작성자 표시는 부가 정보 — auth 장애가 목록/상세 전체를 실패시키면 안 된다
        CommunityWriterSummaryProcessor processor = new CommunityWriterSummaryProcessor(memberIds -> {
            throw new CommunityException(CommunityErrorCode.MEMBER_SERVICE_UNAVAILABLE);
        });

        assertThat(processor.getWriterSummaries(List.of(1L, 2L))).isEmpty();
    }

    @Test
    void getWriterSummaries_passesThroughPortResult() {
        MemberSummaryQueryResult summary = new MemberSummaryQueryResult("1", "사장님A", null);
        CommunityWriterSummaryProcessor processor = new CommunityWriterSummaryProcessor(memberIds -> Map.of(1L, summary));

        Map<Long, MemberSummaryQueryResult> summaries = processor.getWriterSummaries(List.of(1L));

        assertThat(summaries).containsEntry(1L, summary);
    }

    @Test
    void getWriterSummaries_emptyInput_returnsEmptyWithoutPortCall() {
        MemberSummaryQueryPort failingPort = memberIds -> {
            throw new IllegalStateException("호출되면 안 된다");
        };

        assertThat(new CommunityWriterSummaryProcessor(failingPort).getWriterSummaries(List.of())).isEmpty();
    }
}
