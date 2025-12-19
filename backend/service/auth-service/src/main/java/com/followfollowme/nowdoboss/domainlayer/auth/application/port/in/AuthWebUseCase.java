package com.followfollowme.nowdoboss.domainlayer.auth.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.AuthGeneralLoginResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.application.command.AuthGeneralLoginCommand;

public interface AuthWebUseCase {

    AuthGeneralLoginResponse generalLogin(AuthGeneralLoginCommand command);
}
