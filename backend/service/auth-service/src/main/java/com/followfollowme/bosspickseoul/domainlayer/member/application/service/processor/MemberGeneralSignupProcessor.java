package com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberException;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.SignupEmailVerificationPort;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.Member;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberStatus;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import java.util.Locale;
import com.followfollowme.bosspickseoul.security.common.enums.SecurityRole;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MemberGeneralSignupProcessor {

    private final MemberRepositoryPort memberRepositoryPort;
    private final MemberConsentProcessor memberConsentProcessor;
    private final SignupEmailVerificationPort signupEmailVerificationPort;
    private final PasswordEncoder passwordEncoder;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    public void generalSignup(MemberGeneralSignupCommand command) {
        // 이메일은 인증 플래그 키(Redis)와 정합되도록 trim + 소문자로 정규화해 저장/검증한다.
        String email = command.email().trim().toLowerCase(Locale.ROOT);

        // 1. 필수 동의와 만 14세 이상 확인 검증
        validateSignupConsents(command);

        // 2. 이메일 인증 완료 여부 검증
        validateEmailVerified(email);

        // 3. 이메일 중복 검증
        validateEmailNotExists(email);

        // 4. 회원 저장 → 동의 이력 기록 → 인증 플래그 소비.
        //    이력은 회원 저장 뒤에 남긴다 — memberId 가 있어야 하고, 중복 이메일로 막힌 요청이 이력만 남기는 일도 없어야 한다.
        Member member = memberRepositoryPort.save(createMember(command, email));
        memberConsentProcessor.recordSignupConsents(member.id());
        signupEmailVerificationPort.consume(email);
    }

    /**
     * 개발/테스트 전용 즉시 가입 — 이메일 인증 게이트만 건너뛰고 나머지 규칙(정규화/중복 검증/
     * 비밀번호 인코딩)은 일반 가입과 동일하다. 노출은 {@code @Profile("!prod")} 컨트롤러가 책임진다.
     *
     * <p><b>동의는 dev 기본값으로 채우지 않고 일반 가입과 똑같이 요청에서 받아 검사하고, 똑같이 이력을 남긴다.</b>
     * 이 경로는 일반 가입과 같은 요청 DTO 를 써서 바디가 같다. 기본값으로 채우면 사용자가 체크하지 않은 동의를 서버가
     * "동의함" 으로 적는 경로가 코드에 생기는데, 동의 이력은 그런 행이 하나도 없어야 의미가 있다. 또 개발 계정만
     * 이력이 다르면 이력을 읽는 쪽(조회·파기)이 운영에서는 생기지 않는 모양을 다루게 된다.
     *
     * @return 만들어진 회원. 생성된 아이디를 호출부가 응답에 실을 수 있게 돌려준다
     */
    public Member devSignup(MemberGeneralSignupCommand command) {
        String email = command.email().trim().toLowerCase(Locale.ROOT);
        validateSignupConsents(command);
        validateEmailNotExists(email);

        Member member = memberRepositoryPort.save(createMember(command, email));
        memberConsentProcessor.recordSignupConsents(member.id());
        return member;
    }

    /**
     * 동의·확인 없이 가입 경로에 들어오지 못하게 막는다.
     *
     * <p>web 경계의 {@code @AssertTrue}(MEMBER_114~116)와 <b>중복 검사가 아니다.</b> 그쪽이 지키는 것은 "요청 형식이
     * 올바른가"이고, 여기서 지키는 것은 <b>"우리가 남기는 동의 행이 실제 동의를 반영한다"는 불변식</b>이다. 가입 성공
     * 경로가 무조건 동의 행을 남기므로, 이 검사가 없으면 DTO 를 거치지 않는 호출자가 생기는 순간 동의하지 않은 회원의
     * 동의 이력이 만들어진다.
     *
     * <p>문서 동의 누락({@code MEMBER_010})과 만 14세 미만({@code MEMBER_011})은 코드를 나눈다. 같은 요청에서 막히는
     * 체크박스가 서로 달라, 합치면 프론트가 어느 쪽을 강조할지 알 수 없다. 둘 다 비면 문서 동의를 먼저 알린다.
     * 만 14세 미만을 막는 근거는 개인정보 보호법 제22조의2 다 — 이 서비스에는 법정대리인 동의 흐름이 없다.
     */
    private void validateSignupConsents(MemberGeneralSignupCommand command) {
        if (!command.termsAgreed() || !command.privacyAgreed()) {
            throw new MemberException(MemberErrorCode.CONSENT_REQUIRED);
        }
        if (!command.ageOver14Confirmed()) {
            throw new MemberException(MemberErrorCode.AGE_REQUIREMENT_NOT_MET);
        }
    }

    private void validateEmailVerified(String email) {
        if (!signupEmailVerificationPort.isVerified(email)) {
            throw new MemberException(MemberErrorCode.EMAIL_NOT_VERIFIED);
        }
    }

    private void validateEmailNotExists(String email) {
        // 계정 상태(탈퇴/정지) 노출을 막기 위해 상태와 무관하게 동일한 응답을 반환한다.
        if (memberRepositoryPort.findByEmail(email).isPresent()) {
            throw new MemberException(MemberErrorCode.EXIST_MEMBER_EMAIL, email);
        }
    }

    private Member createMember(MemberGeneralSignupCommand command, String email) {
        return Member.builder()
            .id(snowflakeIdGenerator.generateId())
            .email(email)
            .password(passwordEncoder.encode(command.password()))
            .name(command.name())
            .nickname(command.nickname())
            .profileImageUrl(null)
            .role(SecurityRole.USER)
            .status(MemberStatus.ACTIVE)
            .build();
    }
}
