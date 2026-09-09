package com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.item.MemberSummaryItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "회원 요약 일괄 조회 응답 DTO — 요청한 ID 중 존재하는 회원만 담긴다")
public record MemberSummariesResponse(

    @Schema(description = "회원 요약 목록")
    List<MemberSummaryItem> members
) {

}
