package com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.provider.RefreshCookieProvider;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.exception.MemberExceptionHandler;
import com.followfollowme.bosspickseoul.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.in.MemberDevSignupUseCase;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.in.MemberWebUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * 가입 요청의 필수 동의·확인 검증을 web 경계에서 고정한다.
 *
 * <p>핵심은 <b>필드가 빠진 요청</b>이다. 동의 플래그가 래퍼 {@code Boolean} 이면 {@code @AssertTrue} 가 null 을 유효로 봐서,
 * 필드를 아예 보내지 않은 요청이 동의 없이 가입된다. primitive 라서 Jackson 이 {@code false} 로 채우고 그대로 걸러지는지를
 * 실제 JSON 역직렬화 경로로 확인한다.
 */
class MemberSignupConsentValidationTest {

    private static final String SIGNUP = "/api/v1/members/signup";
    private static final String DEV_SIGNUP = "/api/v1/members/signup/dev";
    private static final String BASE_FIELDS = "\"email\":\"user@example.com\",\"password\":\"Password1!\",\"name\":\"홍길동\",\"nickname\":\"길동짱\"";

    private MemberWebUseCase memberWebUseCase;
    private MemberDevSignupUseCase memberDevSignupUseCase;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        memberWebUseCase = mock(MemberWebUseCase.class);
        memberDevSignupUseCase = mock(MemberDevSignupUseCase.class);
        mockMvc = MockMvcBuilders
            .standaloneSetup(
                new MemberWebController(memberWebUseCase, mock(RefreshCookieProvider.class)),
                new MemberDevSignupWebController(memberDevSignupUseCase))
            .setControllerAdvice(new MemberExceptionHandler())
            .build();
    }

    @Test
    @DisplayName("세 항목이 모두 true 면 통과하고 동의 값이 그대로 가입 명령에 실린다")
    void allAgreed_passesThroughToUseCase() throws Exception {
        signup(SIGNUP, BASE_FIELDS + ",\"termsAgreed\":true,\"privacyAgreed\":true,\"ageOver14Confirmed\":true")
            .andExpect(status().isOk());

        ArgumentCaptor<MemberGeneralSignupCommand> captor = ArgumentCaptor.forClass(MemberGeneralSignupCommand.class);
        verify(memberWebUseCase).generalSignup(captor.capture());
        assertThat(captor.getValue().termsAgreed()).isTrue();
        assertThat(captor.getValue().privacyAgreed()).isTrue();
        assertThat(captor.getValue().ageOver14Confirmed()).isTrue();
    }

    @Test
    @DisplayName("이용약관 동의가 false 면 MEMBER_114")
    void termsFalse_isRejectedWithItsOwnCode() throws Exception {
        expectRejected(BASE_FIELDS + ",\"termsAgreed\":false,\"privacyAgreed\":true,\"ageOver14Confirmed\":true", "MEMBER_114", "termsAgreed");
    }

    @Test
    @DisplayName("개인정보 처리방침 동의가 false 면 MEMBER_115")
    void privacyFalse_isRejectedWithItsOwnCode() throws Exception {
        expectRejected(BASE_FIELDS + ",\"termsAgreed\":true,\"privacyAgreed\":false,\"ageOver14Confirmed\":true", "MEMBER_115", "privacyAgreed");
    }

    @Test
    @DisplayName("만 14세 이상 확인이 false 면 동의 누락과 다른 MEMBER_116")
    void ageFalse_isRejectedWithTheAgeCode() throws Exception {
        expectRejected(BASE_FIELDS + ",\"termsAgreed\":true,\"privacyAgreed\":true,\"ageOver14Confirmed\":false", "MEMBER_116", "ageOver14Confirmed");
    }

    @Test
    @DisplayName("동의 필드를 아예 빼고 보내도 400 이다 — primitive 라 false 로 채워져 @AssertTrue 에 걸린다")
    void omittedField_isRejectedNotSilentlyAccepted() throws Exception {
        expectRejected(BASE_FIELDS + ",\"privacyAgreed\":true,\"ageOver14Confirmed\":true", "MEMBER_114", "termsAgreed");
        expectRejected(BASE_FIELDS + ",\"termsAgreed\":true,\"privacyAgreed\":true", "MEMBER_116", "ageOver14Confirmed");
    }

    @Test
    @DisplayName("동의 필드에 null 을 보내도 400 이다")
    void explicitNull_isRejected() throws Exception {
        expectRejected(BASE_FIELDS + ",\"termsAgreed\":null,\"privacyAgreed\":true,\"ageOver14Confirmed\":true", "MEMBER_114", "termsAgreed");
    }

    @Test
    @DisplayName("동의 필드 셋이 모두 빠진 기존 바디는 세 오류를 선언 순서대로 돌려준다")
    void legacyBodyWithoutAnyConsent_listsAllThreeInDeclarationOrder() throws Exception {
        // 동의 필드가 생기기 전의 프론트가 보내던 바디. 대표 코드는 첫 오류(이용약관)이고, 나머지는 errors 에 순서대로 담긴다.
        signup(SIGNUP, BASE_FIELDS)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("MEMBER_114"))
            .andExpect(jsonPath("$.dataHeader.resultMessage.errors[0].code").value("MEMBER_114"))
            .andExpect(jsonPath("$.dataHeader.resultMessage.errors[1].code").value("MEMBER_115"))
            .andExpect(jsonPath("$.dataHeader.resultMessage.errors[2].code").value("MEMBER_116"));

        verify(memberWebUseCase, never()).generalSignup(any());
    }

    @Test
    @DisplayName("개발용 가입도 같은 바디라 동의가 빠지면 같은 코드로 거부한다")
    void devSignup_requiresTheSameConsents() throws Exception {
        signup(DEV_SIGNUP, BASE_FIELDS + ",\"termsAgreed\":true,\"privacyAgreed\":true")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("MEMBER_116"));

        verify(memberDevSignupUseCase, never()).devSignup(any());
    }

    private void expectRejected(String fields, String expectedCode, String expectedField) throws Exception {
        signup(SIGNUP, fields)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value(expectedCode))
            .andExpect(jsonPath("$.dataHeader.resultMessage.errors[0].field").value(expectedField));

        verify(memberWebUseCase, never()).generalSignup(any());
    }

    private ResultActions signup(String path, String fields) throws Exception {
        return mockMvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{" + fields + "}"));
    }
}
