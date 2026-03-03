package com.followfollowme.nowdoboss.domainlayer.auth.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.response.AuthGeneralLoginResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.response.TokenReissueResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.application.command.AuthGeneralLoginCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.command.TokenReissueCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.AuthCookieResult;

public interface AuthWebUseCase {

    AuthCookieResult<AuthGeneralLoginResponse> generalLogin(AuthGeneralLoginCommand command);

    void logout(long memberId, String tokenId);

    AuthCookieResult<TokenReissueResponse> reissueToken(TokenReissueCommand command);
}
