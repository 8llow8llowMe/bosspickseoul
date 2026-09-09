package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client.feign;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.MemberSummariesQueryResult;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(
    name = "${feign-client.target-services.auth-service:auth-service}",
    contextId = "communityMemberClient"
)
public interface CommunityMemberClient {

    /** 작성자 표시용 회원 요약 일괄 조회. 한 번에 최대 100건 (auth-service 상한). */
    @GetMapping("/api/v1/members/summaries")
    Response<MemberSummariesQueryResult> getMemberSummaries(@RequestParam("memberIds") List<Long> memberIds);
}
