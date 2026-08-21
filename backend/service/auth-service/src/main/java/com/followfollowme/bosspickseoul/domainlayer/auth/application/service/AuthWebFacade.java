package com.followfollowme.bosspickseoul.domainlayer.auth.application.service;

import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.response.AuthGeneralLoginResponse;
import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.response.AuthOAuthAuthorizeResponse;
import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.response.TokenReissueResponse;
import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.presenter.AuthPresenter;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.command.AuthGeneralLoginCommand;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.command.TokenReissueCommand;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.AuthCookieResult;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.GeneralLoginInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.JwtTokenIssueInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.JwtTokenReissueInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.in.AuthWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.query.OAuthMemberQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.service.processor.EmailVerificationProcessor;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.service.processor.GeneralLoginProcessor;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.service.processor.JwtTokenProcessor;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.service.processor.OAuthLoginProcessor;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.OAuthProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthWebFacade implements AuthWebUseCase {

    private final GeneralLoginProcessor generalLoginProcessor;
    private final OAuthLoginProcessor oAuthLoginProcessor;
    private final JwtTokenProcessor jwtTokenProcessor;
    private final EmailVerificationProcessor emailVerificationProcessor;
    private final AuthPresenter authPresenter;

    @Override
    @Transactional
    public AuthCookieResult<AuthGeneralLoginResponse> generalLogin(AuthGeneralLoginCommand command) {
        // 1. 일반 로그인 자격 검증
        GeneralLoginInfo generalLoginInfo = generalLoginProcessor.generalLogin(command);

        // 2. 토큰 발급
        JwtTokenIssueInfo jwtTokenIssueInfo = jwtTokenProcessor.issueTokens(generalLoginInfo.memberId(), generalLoginInfo.role());

        // 3. Presenter를 통한 Info -> Response 변환
        AuthGeneralLoginResponse response = authPresenter.toGeneralLoginResponse(jwtTokenIssueInfo);

        return AuthCookieResult.of(response, jwtTokenIssueInfo.refreshToken());
    }

    @Override
    public void logout(long memberId, String tokenId) {
        jwtTokenProcessor.revokeToken(memberId, tokenId);
    }

    @Override
    @Transactional
    public AuthCookieResult<TokenReissueResponse> reissueToken(TokenReissueCommand command) {
        // 1. 토큰 재발급 수행
        JwtTokenReissueInfo jwtTokenReissueInfo = jwtTokenProcessor.reissueTokens(command.refreshToken());

        // 2. Presenter를 통한 Info -> Response 변환
        TokenReissueResponse response = authPresenter.toTokenReissueResponse(jwtTokenReissueInfo);

        return AuthCookieResult.of(response, jwtTokenReissueInfo.newRefreshToken());
    }

    @Override
    public void sendEmailVerificationCode(String email) {
        // Redis/메일 중심 흐름이라 트랜잭션 경계를 두지 않는다 (DB 조회는 단건 findByEmail뿐).
        emailVerificationProcessor.sendCode(email);
    }

    @Override
    public void verifyEmailVerificationCode(String email, String code) {
        emailVerificationProcessor.verifyCode(email, code);
    }

    @Override
    public AuthOAuthAuthorizeResponse generateOAuthAuthorizationUrl(OAuthProvider provider) {
        String authorizationUrl = oAuthLoginProcessor.generateAuthorizationUrl(provider);
        return authPresenter.toOAuthAuthorizeResponse(authorizationUrl);
    }

    @Override
    public AuthCookieResult<AuthGeneralLoginResponse> oauthLogin(OAuthProvider provider, String authCode, String state) {
        // 1. state 검증 + provider 프로필 조회 — 외부 HTTP 왕복이므로 트랜잭션 밖에서 수행한다.
        OAuthMemberQueryResult oAuthMember = oAuthLoginProcessor.fetchOAuthMember(provider, authCode, state);

        // 2. 회원 조회/생성 (Processor의 트랜잭션 경계) 후 토큰 발급
        GeneralLoginInfo loginInfo = oAuthLoginProcessor.login(provider, oAuthMember);
        JwtTokenIssueInfo jwtTokenIssueInfo = jwtTokenProcessor.issueTokens(loginInfo.memberId(), loginInfo.role());

        // 3. Presenter를 통한 Info -> Response 변환
        AuthGeneralLoginResponse response = authPresenter.toGeneralLoginResponse(jwtTokenIssueInfo);

        return AuthCookieResult.of(response, jwtTokenIssueInfo.refreshToken());
    }
}