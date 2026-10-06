package com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.response.AuthOAuthAuthorizeResponse;
import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.exception.AuthExceptionHandler;
import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.provider.RefreshCookieProvider;
import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.support.ClientIpResolver;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.model.OAuthSignupConsent;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.in.AuthWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.OAuthProvider;
import com.followfollowme.bosspickseoul.global.config.WebConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.format.support.DefaultFormattingConversionService;
import org.springframework.format.support.FormattingConversionService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * {@code GET /{provider}/authorize} 의 동의 파라미터 바인딩을 고정한다. 동의 값이 유스케이스까지 그대로 가야 state 에 실리고,
 * 생략하면 "받지 않음" 이어야 기존 회원 로그인이 동의 없이 동작한다.
 */
class AuthOAuthAuthorizeConsentParameterTest {

    private static final String AUTHORIZE = "/api/v1/auth/kakao/authorize";

    private AuthWebUseCase authWebUseCase;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        authWebUseCase = mock(AuthWebUseCase.class);
        when(authWebUseCase.generateOAuthAuthorizationUrl(any(), any()))
            .thenReturn(AuthOAuthAuthorizeResponse.builder().authorizationUrl("https://example.test/authorize").build());
        // 운영과 같은 경로 변환(kakao → KAKAO)을 쓴다.
        FormattingConversionService conversionService = new DefaultFormattingConversionService();
        new WebConfig().addFormatters(conversionService);
        mockMvc = MockMvcBuilders
            .standaloneSetup(new AuthWebController(authWebUseCase, mock(RefreshCookieProvider.class), mock(ClientIpResolver.class)))
            .setConversionService(conversionService)
            .setControllerAdvice(new AuthExceptionHandler())
            .build();
    }

    @Test
    @DisplayName("동의 파라미터 셋이 그대로 유스케이스에 전달된다")
    void consentParameters_arePassedThrough() throws Exception {
        mockMvc.perform(get(AUTHORIZE).param("termsAgreed", "true").param("privacyAgreed", "true").param("ageOver14Confirmed", "true"))
            .andExpect(status().isOk());

        verify(authWebUseCase).generateOAuthAuthorizationUrl(OAuthProvider.KAKAO, new OAuthSignupConsent(true, true, true));
    }

    @Test
    @DisplayName("동의 파라미터를 생략해도 허용하고, 받지 않은 것으로 넘긴다 — 기존 회원 로그인 경로")
    void omittedConsent_isAllowedAsNone() throws Exception {
        mockMvc.perform(get(AUTHORIZE)).andExpect(status().isOk());

        verify(authWebUseCase).generateOAuthAuthorizationUrl(OAuthProvider.KAKAO, OAuthSignupConsent.none());
    }

    @Test
    @DisplayName("일부만 실어도 그대로 전달한다 — 판단은 콜백에서 신규 회원일 때만 한다")
    void partialConsent_isPassedAsIs() throws Exception {
        mockMvc.perform(get(AUTHORIZE).param("termsAgreed", "true")).andExpect(status().isOk());

        verify(authWebUseCase).generateOAuthAuthorizationUrl(eq(OAuthProvider.KAKAO), eq(new OAuthSignupConsent(true, false, false)));
    }

    @Test
    @DisplayName("boolean 이 아닌 값은 AUTH_105 로 거절한다")
    void nonBooleanConsent_isRejectedWithTypeCode() throws Exception {
        mockMvc.perform(get(AUTHORIZE).param("termsAgreed", "yes-please"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("AUTH_105"));

        verify(authWebUseCase, never()).generateOAuthAuthorizationUrl(any(), any());
    }
}
