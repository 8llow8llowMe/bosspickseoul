package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client.feign.CommunityMemberClient;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.MemberSummariesQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.MemberSummariesQueryResult.MemberSummaryQueryResult;
import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CommunityMemberSummaryClientAdapterTest {

    private StubCommunityMemberClient client;
    private CommunityMemberSummaryClientAdapter adapter;

    @BeforeEach
    void setUp() {
        client = new StubCommunityMemberClient();
        adapter = new CommunityMemberSummaryClientAdapter(
            client, new InternalResponseSupport(CircuitBreakerRegistry.ofDefaults()));
    }

    @Test
    void findSummaries_mapsByMemberIdAndOmitsMissing() {
        client.response = () -> Response.success(new MemberSummariesQueryResult(List.of(
            new MemberSummaryQueryResult("1", "사장님A", "https://cdn/pf-1.png"),
            new MemberSummaryQueryResult("2", "탈퇴회원", null))));

        Map<Long, MemberSummaryQueryResult> summaries = adapter.findSummaries(List.of(1L, 2L, 999L));

        assertThat(summaries).hasSize(2);
        assertThat(summaries.get(1L).nickname()).isEqualTo("사장님A");
        assertThat(summaries.get(2L).nickname()).isEqualTo("탈퇴회원");
        assertThat(summaries).doesNotContainKey(999L);
    }

    @Test
    void findSummaries_emptyInput_returnsEmptyWithoutRemoteCall() {
        client.response = () -> {
            throw new IllegalStateException("호출되면 안 된다");
        };

        assertThat(adapter.findSummaries(List.of())).isEmpty();
    }

    @Test
    void findSummaries_authServiceDown_throwsMemberServiceUnavailable() {
        client.response = () -> {
            throw new FeignException.InternalServerError("boom", request(), null, Map.of());
        };

        assertThatThrownBy(() -> adapter.findSummaries(List.of(1L)))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.MEMBER_SERVICE_UNAVAILABLE);
    }

    private Request request() {
        return Request.create(Request.HttpMethod.GET, "/", Map.of(), null, StandardCharsets.UTF_8, new RequestTemplate());
    }

    private static class StubCommunityMemberClient implements CommunityMemberClient {

        private Supplier<Response<MemberSummariesQueryResult>> response;

        @Override
        public Response<MemberSummariesQueryResult> getMemberSummaries(List<Long> memberIds) {
            return response.get();
        }
    }
}
