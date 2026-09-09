package com.followfollowme.bosspickseoul.domainlayer.auth.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.auth.application.command.AuthGeneralLoginCommand;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.exception.AuthErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.exception.AuthException;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.GeneralLoginInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.LoginAttemptStorePort;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberException;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.Member;
import com.followfollowme.bosspickseoul.global.properties.LoginAttemptProperties;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class GeneralLoginProcessor {

    private final MemberRepositoryPort memberRepositoryPort;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptStorePort loginAttemptStorePort;
    private final LoginAttemptProperties loginAttemptProperties;
    // 미존재 이메일에도 bcrypt를 1회 수행해 응답 시간으로 계정 존재 여부가 드러나지 않게 한다.
    private final String timingEqualizerHash;

    public GeneralLoginProcessor(
        MemberRepositoryPort memberRepositoryPort,
        PasswordEncoder passwordEncoder,
        LoginAttemptStorePort loginAttemptStorePort,
        LoginAttemptProperties loginAttemptProperties
    ) {
        this.memberRepositoryPort = memberRepositoryPort;
        this.passwordEncoder = passwordEncoder;
        this.loginAttemptStorePort = loginAttemptStorePort;
        this.loginAttemptProperties = loginAttemptProperties;
        this.timingEqualizerHash = passwordEncoder.encode("timing-equalizer-placeholder");
    }

    /**
     * 일반 로그인. brute-force 방어는 두 축이다.
     *
     * <ul>
     *   <li><b>이메일 단위 잠금</b>(`AUTH_015`) — <b>계정 존재 여부와 무관하게 이메일 키만으로</b>
     *       동작한다. 미존재 이메일도 실패로 카운팅되고 같은 임계값에서 같은 코드로 잠기므로,
     *       잠금 응답이 "이 이메일은 가입돼 있다"는 신호가 되지 않는다. (기존 계정 열거 방지 설계 —
     *       미존재/비밀번호 불일치 통합 응답 + 더미 bcrypt 타이밍 균등화 — 를 잠금 경로까지 연장한 것)</li>
     *   <li><b>IP 단위 상한</b>(`AUTH_020`) — 이메일 잠금은 계정마다 임계값 미만으로만 시도하면
     *       뚫린다. 한 IP 가 여러 이메일로 뿌리는 공격은 이 축에서 막는다.</li>
     * </ul>
     *
     * <p>검사 순서는 <b>IP 상한 → 이메일 잠금 → 회원 조회</b>다. 비용이 싼 순서이기도 하고,
     * 이미 상한에 걸린 IP 에는 DB 조회와 bcrypt 비용을 아예 주지 않기 위함이다.
     */
    public GeneralLoginInfo generalLogin(AuthGeneralLoginCommand command) {
        // Redis 키(case-sensitive)와 DB 저장값(정규화된 이메일) 정합을 위해 동일하게 정규화한다.
        String email = EmailVerificationProcessor.normalize(command.email());
        String clientIp = command.clientIp();

        // 1. IP 상한 검사 — 이메일을 바꿔가며 시도하는 공격은 이 축에서만 걸린다.
        if (isIpRateLimited(clientIp)) {
            throw new AuthException(AuthErrorCode.LOGIN_IP_RATE_LIMITED);
        }

        // 2. 잠금 검사 — 회원 조회보다 먼저 수행해 잠긴 이메일에는 DB 조회/bcrypt 비용조차 주지 않는다.
        if (loginAttemptStorePort.isLocked(email)) {
            throw new AuthException(AuthErrorCode.LOGIN_ATTEMPT_LOCKED);
        }

        // 3. 회원 조회 (미존재도 LOGIN_FAILED로 응답해 계정 존재 여부를 노출하지 않는다)
        Optional<Member> memberHolder = memberRepositoryPort.findByEmail(email);
        if (memberHolder.isEmpty()) {
            passwordEncoder.matches(command.password(), timingEqualizerHash);
            throw registerFailure(email, clientIp);
        }
        Member member = memberHolder.get();

        // 4. 비밀번호를 먼저 검증하고, 상태(탈퇴/정지)는 비밀번호가 맞을 때만 노출한다.
        if (!matchesPassword(command.password(), member.password())) {
            throw registerFailure(email, clientIp);
        }
        validateMemberStatus(member);

        // 5. 성공 시 실패 카운터/잠금 초기화 후 로그인 정보 반환.
        //    IP 카운터는 지우지 않는다 — 자기 계정 로그인 한 번으로 공격자가 상한을 초기화할 수 있게 된다.
        //    윈도우 만료로만 풀린다.
        loginAttemptStorePort.clearFailures(email);
        return GeneralLoginInfo.of(member.id(), member.role());
    }

    /**
     * IP 가 현재 윈도우의 실패 상한을 이미 채웠는지 본다.
     *
     * <p>IP 를 알 수 없으면(헤더도 remoteAddr 도 비어 있는 비정상 경로) 상한을 적용하지 않는다.
     * 빈 문자열을 키로 쓰면 IP 를 못 얻은 모든 요청이 한 카운터를 공유해 서로를 잠근다.
     */
    private boolean isIpRateLimited(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            return false;
        }
        return loginAttemptStorePort.getIpFailureCount(clientIp) >= loginAttemptProperties.ipMaxFailCount();
    }

    /**
     * 실패 카운터(이메일 + IP)를 올리고 던질 예외를 결정한다. 이메일 임계값에 도달하면 잠금을 걸고
     * `AUTH_015`, 그 전까지는 기존과 동일한 `AUTH_006` 을 반환한다.
     *
     * <p>IP 카운터는 올리기만 하고 이번 응답 코드에는 영향을 주지 않는다. 상한 판정은 다음 요청의
     * 1번 단계에서 한다 — 이번 시도는 이미 이메일/비밀번호 검증까지 마쳤으므로 그 결과를 그대로
     * 돌려주는 편이, 마지막 한 번만 코드가 바뀌어 공격자에게 임계값 위치를 알려주는 것보다 낫다.
     *
     * <p>저장소 장애 시 카운터가 0 을 반환하면(fail-open) 잠금 없이 `AUTH_006` 으로만 응답한다 —
     * 카운터 저장소 장애로 로그인 전체를 막지 않는다.
     */
    private AuthException registerFailure(String email, String clientIp) {
        if (clientIp != null && !clientIp.isBlank()) {
            loginAttemptStorePort.increaseIpFailureCount(clientIp, loginAttemptProperties.ipWindow());
        }

        long failureCount = loginAttemptStorePort.increaseFailureCount(email, loginAttemptProperties.lockDuration());
        if (failureCount >= loginAttemptProperties.maxFailureCount()) {
            loginAttemptStorePort.lock(email, loginAttemptProperties.lockDuration());
            return new AuthException(AuthErrorCode.LOGIN_ATTEMPT_LOCKED);
        }
        return new AuthException(AuthErrorCode.LOGIN_FAILED);
    }

    private void validateMemberStatus(Member member) {
        switch (member.status()) {
            case WITHDRAWN -> throw new MemberException(MemberErrorCode.MEMBER_ALREADY_WITHDRAWN);
            case SUSPENDED -> throw new MemberException(MemberErrorCode.MEMBER_SUSPENDED);
            case ACTIVE -> {
            } // 정상
        }
    }

    private boolean matchesPassword(String rawPassword, String encodedPassword) {
        // 소셜 확장 대비 password nullable — 비밀번호가 없는 계정도 동일하게 LOGIN_FAILED로 응답한다.
        return encodedPassword != null && passwordEncoder.matches(rawPassword, encodedPassword);
    }
}
