package com.followfollowme.nowdoboss.domainlayer.auth.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.response.AuthGeneralLoginResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.response.AuthOAuthAuthorizeResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.response.TokenReissueResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.application.command.AuthGeneralLoginCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.command.TokenReissueCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.AuthCookieResult;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.OAuthProvider;

public interface AuthWebUseCase {

    AuthCookieResult<AuthGeneralLoginResponse> generalLogin(AuthGeneralLoginCommand command);

    void logout(long memberId, String tokenId);

    AuthCookieResult<TokenReissueResponse> reissueToken(TokenReissueCommand command);

    void sendEmailVerificationCode(String email);

    void verifyEmailVerificationCode(String email, String code);

    AuthOAuthAuthorizeResponse generateOAuthAuthorizationUrl(OAuthProvider provider);

    AuthCookieResult<AuthGeneralLoginResponse> oauthLogin(OAuthProvider provider, String authCode, String state);
}
