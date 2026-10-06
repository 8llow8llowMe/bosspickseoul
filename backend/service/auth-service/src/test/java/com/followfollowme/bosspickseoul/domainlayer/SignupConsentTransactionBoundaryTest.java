package com.followfollowme.bosspickseoul.domainlayer;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.out.member.SignupConsentRecordAdapter;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.OAuthCallbackInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.service.AuthWebFacade;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.service.processor.OAuthLoginProcessor;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.request.MemberGeneralSignupRequest;
import com.followfollowme.bosspickseoul.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.bosspickseoul.domainlayer.member.application.service.MemberDevSignupFacade;
import com.followfollowme.bosspickseoul.domainlayer.member.application.service.MemberWebFacade;
import com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor.MemberConsentProcessor;
import com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor.MemberGeneralSignupProcessor;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.OAuthProvider;
import java.lang.reflect.AnnotatedElement;
import java.lang.reflect.Method;
import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 회원 행과 동의 이력 행이 <b>한 트랜잭션</b>에 묶이도록 트랜잭션 경계의 위치를 고정한다. (이슈 #494)
 *
 * <p>동의 이력을 남기는 쪽({@link MemberConsentProcessor}, {@link SignupConsentRecordAdapter})은 트랜잭션을 열지 않고 호출자에
 * 합류한다. 누가 여기에 {@code @Transactional(propagation = REQUIRES_NEW)} 같은 것을 붙이면 회원과 이력이 따로 커밋돼
 * "동의 없는 회원" 이나 "회원 없는 동의" 가 생기는데, 단위 테스트는 트랜잭션을 돌리지 않아 그 변화를 못 잡는다. 그래서
 * 어노테이션 배치를 직접 본다.
 *
 * <ul>
 *   <li>경계는 일반 가입 {@code MemberWebFacade.generalSignup}, 개발용 가입 {@code MemberDevSignupFacade.devSignup},
 *       소셜 첫 가입 {@code OAuthLoginProcessor.login} 에 있다 (전파 REQUIRED, 쓰기).</li>
 *   <li>{@code AuthWebFacade.oauthLogin} 에는 없다 — provider HTTP 왕복 동안 DB 커넥션을 잡지 않기 위해서다.</li>
 * </ul>
 */
class SignupConsentTransactionBoundaryTest {

    @ParameterizedTest
    @ValueSource(classes = {MemberConsentProcessor.class, SignupConsentRecordAdapter.class, MemberGeneralSignupProcessor.class})
    @DisplayName("동의 이력을 남기는 쪽은 트랜잭션을 열지 않고 호출자 트랜잭션에 합류한다")
    void consentWritersDoNotOpenTheirOwnTransaction(Class<?> type) {
        assertThat(isTransactional(type)).as("%s class", type.getSimpleName()).isFalse();
        for (Method method : type.getDeclaredMethods()) {
            assertThat(isTransactional(method)).as("%s.%s", type.getSimpleName(), method.getName()).isFalse();
        }
    }

    @Test
    @DisplayName("소셜 첫 가입의 회원 생성과 동의 이력은 OAuthLoginProcessor.login 의 쓰기 트랜잭션 하나에 묶인다")
    void oauthLoginProcessorOwnsTheWriteTransaction() throws NoSuchMethodException {
        assertWriteTransaction(OAuthLoginProcessor.class.getMethod("login", OAuthProvider.class, OAuthCallbackInfo.class));
    }

    @Test
    @DisplayName("일반·개발용 가입의 회원 생성과 동의 이력은 각 Facade 의 쓰기 트랜잭션 하나에 묶인다")
    void signupFacadesOwnTheWriteTransaction() throws NoSuchMethodException {
        assertWriteTransaction(MemberWebFacade.class.getMethod("generalSignup", MemberGeneralSignupCommand.class));
        assertWriteTransaction(MemberDevSignupFacade.class.getMethod("devSignup", MemberGeneralSignupRequest.class));
    }

    @Test
    @DisplayName("AuthWebFacade.oauthLogin 에는 트랜잭션이 없다 — provider HTTP 왕복 동안 DB 커넥션을 잡지 않는다")
    void oauthLoginFacadeHasNoTransaction() {
        assertThat(isTransactional(AuthWebFacade.class)).isFalse();
        Arrays.stream(AuthWebFacade.class.getDeclaredMethods())
            .filter(method -> method.getName().equals("oauthLogin"))
            .forEach(method -> assertThat(isTransactional(method)).as("AuthWebFacade.oauthLogin").isFalse());
    }

    private static void assertWriteTransaction(Method method) {
        Transactional transactional = AnnotatedElementUtils.findMergedAnnotation(method, Transactional.class);
        assertThat(transactional).as("%s has @Transactional", method).isNotNull();
        assertThat(transactional.propagation()).as("%s propagation", method).isEqualTo(Propagation.REQUIRED);
        assertThat(transactional.readOnly()).as("%s readOnly", method).isFalse();
    }

    private static boolean isTransactional(AnnotatedElement element) {
        return AnnotatedElementUtils.hasAnnotation(element, Transactional.class)
            || AnnotatedElementUtils.hasAnnotation(element, jakarta.transaction.Transactional.class);
    }
}
