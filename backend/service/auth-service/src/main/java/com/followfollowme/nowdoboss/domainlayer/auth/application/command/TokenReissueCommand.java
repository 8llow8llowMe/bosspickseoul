package com.followfollowme.nowdoboss.domainlayer.auth.application.command;

import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.request.TokenReissueRequest;
import lombok.Builder;

@Builder
public record TokenReissueCommand(
    long memberId
) {

    public static TokenReissueCommand from(TokenReissueRequest request) {
        return TokenReissueCommand.builder()
            .memberId(Long.parseLong(request.memberId()))
            .build();
    }
}

