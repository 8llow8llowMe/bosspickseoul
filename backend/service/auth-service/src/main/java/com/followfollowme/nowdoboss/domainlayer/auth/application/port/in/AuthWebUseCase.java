package com.followfollowme.nowdoboss.domainlayer.auth.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.response.AuthGeneralLoginResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.response.TokenReissueResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.application.command.AuthGeneralLoginCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.command.TokenReissueCommand;

public interface AuthWebUseCase {

    AuthGeneralLoginResponse generalLogin(AuthGeneralLoginCommand command);

    void logout(long memberId);

    TokenReissueResponse reissueToken(TokenReissueCommand command);
}
