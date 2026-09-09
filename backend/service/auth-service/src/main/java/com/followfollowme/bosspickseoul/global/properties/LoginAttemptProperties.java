package com.followfollowme.bosspickseoul.global.properties;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 일반 로그인 실패 횟수 제한(brute-force 방어) 설정.
 *
 * <p>계정(이메일) 단위와 IP 단위 두 축을 함께 둔다. 이메일 잠금만으로는 한 IP 가 서로 다른
 * 이메일 다수로 뿌리는 공격(credential stuffing)을 막지 못한다 — 계정마다 임계값 미만으로만
 * 시도하면 어느 계정도 잠기지 않기 때문이다.
 *
 * <p><b>계정 단위</b> — 기본값 5회 / 10분은 OWASP 권고 범위(3~10회, 잠금 5~30분)의 중간값이다.
 * 오타 몇 번으로는 걸리지 않고, 초당 수십 회 시도하는 스크립트는 즉시 잠긴다.
 * 실패 카운터의 TTL 도 {@code lockDuration} 과 같은 값을 쓴다. 별도 윈도우 프로퍼티를 두면
 * 조정할 값이 늘어나기만 하고, 실패가 뜸하게 흩어진 경우 카운터가 자연 소멸해야 정상 사용자를
 * 잠그지 않는다는 요구는 이 값으로 충분히 충족된다.
 *
 * <p><b>IP 단위</b> — 기본값 10회 / 1시간은 이미 운영 중인 이메일 발송 IP 상한
 * ({@link EmailSendLimitProperties})과 같은 수치·같은 고정 윈도우 방식이다. 성공한 로그인은
 * 세지 않으므로, 같은 회선을 공유하는 사무실/모바일 NAT 환경에서도 정상 사용자는 걸리지 않는다.
 */
@ConfigurationProperties(prefix = "auth.login")
public record LoginAttemptProperties(
    int maxFailureCount,
    Duration lockDuration,
    int ipMaxFailCount,
    Duration ipWindow
) {

    public LoginAttemptProperties {
        if (maxFailureCount <= 0) {
            maxFailureCount = 5;
        }
        if (lockDuration == null || lockDuration.isZero() || lockDuration.isNegative()) {
            lockDuration = Duration.ofMinutes(10);
        }
        if (ipMaxFailCount <= 0) {
            ipMaxFailCount = 10;
        }
        if (ipWindow == null || ipWindow.isZero() || ipWindow.isNegative()) {
            ipWindow = Duration.ofHours(1);
        }
    }
}
