package com.followfollowme.nowdoboss.domainlayer.auth.application.service;

import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.response.AuthGeneralLoginResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.response.TokenReissueResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.presenter.AuthPresenter;
import com.followfollowme.nowdoboss.domainlayer.auth.application.command.AuthGeneralLoginCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.command.TokenReissueCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.GeneralLoginInfo;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.JwtTokenIssueInfo;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.JwtTokenReissueInfo;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.in.AuthWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.auth.application.service.processor.GeneralLoginProcessor;
import com.followfollowme.nowdoboss.domainlayer.auth.application.service.processor.JwtTokenProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthFacade implements AuthWebUseCase {

    private final GeneralLoginProcessor generalLoginProcessor;
    private final JwtTokenProcessor jwtTokenProcessor;
    private final AuthPresenter authPresenter;

    @Override
    @Transactional
    public AuthGeneralLoginResponse generalLogin(AuthGeneralLoginCommand command) {
        // 1. 일반 로그인 자격 검증
        GeneralLoginInfo generalLoginInfo = generalLoginProcessor.generalLogin(command);

        // 2. 토큰 발급
        JwtTokenIssueInfo jwtTokenIssueInfo = jwtTokenProcessor.issueTokens(generalLoginInfo.memberId(), generalLoginInfo.role());

        // 3. Presenter를 통해 Info -> Response 반환
        return authPresenter.toGeneralLoginResponse(jwtTokenIssueInfo);
    }

    @Override
    public void logout(long memberId) {
        jwtTokenProcessor.revokeToken(memberId);
    }

    @Override
    @Transactional(readOnly = true)
    public TokenReissueResponse reissueToken(TokenReissueCommand command) {
        // 1. 토큰 재발급 수행
        JwtTokenReissueInfo jwtTokenReissueInfo = jwtTokenProcessor.reissueTokens(command.memberId());

        // 2. Presenter를 통해 Info -> Response 변환
        return authPresenter.toTokenReissueResponse(jwtTokenReissueInfo);
    }
}
