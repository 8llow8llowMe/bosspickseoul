package com.followfollowme.bosspickseoul.domainlayer.member.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.request.MemberGeneralSignupRequest;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberDevSignupResponse;

/**
 * 개발/테스트 전용 즉시 가입. 이메일 인증 없이 계정을 만들며, 구현 빈은 {@code @Profile("!prod")} 라
 * 운영에서는 엔드포인트 자체가 존재하지 않는다. 운영 계약인 {@link MemberWebUseCase} 와 분리해 둔다.
 */
public interface MemberDevSignupUseCase {

    MemberDevSignupResponse devSignup(MemberGeneralSignupRequest request);
}
