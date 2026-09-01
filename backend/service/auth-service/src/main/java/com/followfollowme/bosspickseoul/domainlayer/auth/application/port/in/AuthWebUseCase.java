package com.followfollowme.bosspickseoul.domainlayer.auth.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.response.AuthGeneralLoginResponse;
import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.response.AuthOAuthAuthorizeResponse;
import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.response.AuthSessionsResponse;
import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.response.TokenReissueResponse;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.command.AuthGeneralLoginCommand;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.command.TokenReissueCommand;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.AuthCookieResult;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.OAuthProvider;

public interface AuthWebUseCase {

    /** deviceInfo 는 요청의 User-Agent 로, 기기 세션 목록 표시에 쓴다. */
    AuthCookieResult<AuthGeneralLoginResponse> generalLogin(AuthGeneralLoginCommand command, String deviceInfo);

    /** 현재 기기 세션만 로그아웃한다. refreshToken 은 요청 쿠키 값으로, 없으면 access 무효화만 수행한다. */
    void logout(long memberId, String tokenId, String refreshToken);

    AuthCookieResult<TokenReissueResponse> reissueToken(TokenReissueCommand command);

    /** clientIp 는 IP 기준 발송 상한 검사에 쓴다. */
    void sendEmailVerificationCode(String email, String clientIp);

    /** 비밀번호 재설정 코드 발송. 계정 존재 여부와 무관하게 항상 성공으로 응답한다. */
    void sendPasswordResetCode(String email, String clientIp);

    /** 코드 검증 후 비밀번호를 재설정하고 전 기기 세션을 무효화한다. */
    void resetPassword(String email, String code, String newPassword);

    void verifyEmailVerificationCode(String email, String code);

    AuthOAuthAuthorizeResponse generateOAuthAuthorizationUrl(OAuthProvider provider);

    AuthCookieResult<AuthGeneralLoginResponse> oauthLogin(OAuthProvider provider, String authCode, String state, String deviceInfo);

    /** 로그인 중인 기기 세션 목록. refreshToken(요청 쿠키)으로 현재 기기를 표시한다. */
    AuthSessionsResponse getSessions(long memberId, String refreshToken);

    /** 특정 기기 세션 해제 (본인 세션만, 멱등). */
    void revokeSession(long memberId, String sessionId);
}
