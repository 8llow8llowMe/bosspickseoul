package com.followfollowme.bosspickseoul.domainlayer.auth.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.auth.application.exception.AuthErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.exception.AuthException;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.JwtTokenIssueInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.JwtTokenReissueInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.RefreshSessionInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.JwtTokenStorePort;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.RefreshSessionMeta;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberException;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.Member;
import com.followfollowme.bosspickseoul.security.auth.jwt.JwtAuthProperties;
import com.followfollowme.bosspickseoul.security.auth.jwt.JwtAuthProvider;
import com.followfollowme.bosspickseoul.security.auth.jwt.JwtAuthProvider.RefreshTokenClaims;
import com.followfollowme.bosspickseoul.security.common.enums.SecurityRole;
import com.followfollowme.bosspickseoul.security.common.exception.SecurityJwtException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

/**
 * 토큰 발급/재발급/무효화. refresh 토큰은 <b>기기(로그인)별 세션</b>으로 저장한다 —
 * 로그인/회전마다 새 sessionId(jti) 키가 발급되고 회전 시 이전 키를 지우므로,
 * 여러 기기가 서로의 세션을 덮어쓰지 않고 각자 독립적으로 재발급한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JwtTokenProcessor {

    private static final String UNKNOWN_DEVICE = "알 수 없는 기기";
    private static final int DEVICE_INFO_MAX_LENGTH = 150;

    private final JwtAuthProvider jwtAuthProvider;
    private final JwtAuthProperties jwtAuthProperties;
    private final JwtTokenStorePort jwtTokenStorePort;
    private final MemberRepositoryPort memberRepositoryPort;

    /** @param deviceInfo 요청의 User-Agent. 세션 목록 화면의 기기 표시에만 쓴다 (신뢰 필요 판단에는 사용 금지). */
    public JwtTokenIssueInfo issueTokens(long memberId, SecurityRole role, String deviceInfo) {
        // 1. 새 기기 세션 아이디로 토큰 쌍 발급
        String sessionId = UUID.randomUUID().toString();
        String accessToken = jwtAuthProvider.issueAccessToken(memberId, role);
        String refreshToken = jwtAuthProvider.issueRefreshToken(memberId, sessionId);

        // 2. Save refresh token to Redis (세션별 키 + 기기 메타)
        RefreshSessionMeta meta = new RefreshSessionMeta(sanitizeDeviceInfo(deviceInfo), LocalDateTime.now());
        jwtTokenStorePort.save(memberId, sessionId, refreshToken, meta);

        return JwtTokenIssueInfo.of(memberId, role, accessToken, refreshToken);
    }

    /** 로그인 중인 기기 세션 목록. refreshToken(요청 쿠키)으로 현재 기기 여부를 판정한다. */
    public List<RefreshSessionInfo> getSessions(long memberId, String refreshToken) {
        String currentSessionId = resolveSessionId(memberId, refreshToken).orElse(null);
        return jwtTokenStorePort.findAllSessions(memberId).stream()
            .map(session -> RefreshSessionInfo.builder()
                .sessionId(session.sessionId())
                .deviceInfo(session.deviceInfo() == null ? UNKNOWN_DEVICE : session.deviceInfo())
                .createdAt(session.createdAt())
                .lastUsedAt(session.lastUsedAt())
                .current(session.sessionId().equals(currentSessionId))
                .build())
            .toList();
    }

    /**
     * 특정 기기 세션을 해제한다. 이미 없는 세션이어도 멱등하게 성공 처리한다.
     * 해제된 기기의 access 토큰은 만료까지 유효할 수 있다 (기존 다중 기기 한계와 동일).
     */
    public void revokeSessionById(long memberId, String sessionId) {
        jwtTokenStorePort.deleteSession(memberId, sessionId);
    }

    /**
     * 로그아웃용 revoke — <b>현재 기기 세션만</b> 무효화한다. 다른 기기의 로그인은 유지된다.
     * 사용자 편의 경로이므로 Redis 장애 시에도 로그아웃 요청 자체는 성공시킨다(관용 처리).
     *
     * @param refreshToken 요청 쿠키의 refresh 토큰. 없거나 해석 불가하면(만료 등) 세션 삭제는
     *                     건너뛰고 access 토큰 블랙리스트만 등록한다 — 해당 세션은 어차피 만료됐거나
     *                     쿠키가 이미 사라진 상태다.
     */
    public void revokeCurrentSession(long memberId, String accessTokenId, String refreshToken) {
        try {
            resolveSessionId(memberId, refreshToken)
                .ifPresent(sessionId -> jwtTokenStorePort.deleteSession(memberId, sessionId));
            blacklistAccessToken(memberId, accessTokenId);
        } catch (DataAccessException e) {
            log.error("[JwtTokenProcessor] 로그아웃 revoke 실패(관용 처리): memberId={}, error={}", memberId, e.getMessage());
        }
    }

    /**
     * 보안 이벤트(탈퇴/비밀번호 변경/상태 이상)용 revoke — <b>전 기기 세션</b>을 무효화한다.
     * 실패를 전파해 호출 트랜잭션을 롤백시킨다 — "세션 무효화 없이 성공한 것처럼 보이는" 상태를
     * 만들지 않기 위함이다.
     */
    public void revokeAllSessions(long memberId, String tokenId) {
        jwtTokenStorePort.deleteAllSessions(memberId);
        blacklistAccessToken(memberId, tokenId);
    }

    public JwtTokenReissueInfo reissueTokens(String refreshToken) {
        // 1. Validate refresh token and extract member id + session id
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new AuthException(AuthErrorCode.EXPIRED_REFRESH_TOKEN);
        }
        RefreshTokenClaims claims = jwtAuthProvider.parseRefreshToken(refreshToken);
        long memberId = claims.memberId();

        // 2. Compare token with Redis value (세션 키 — 다른 기기 로그인으로 밀려났으면 재로그인 필요)
        String storedToken = jwtTokenStorePort.find(memberId, claims.tokenId())
            .orElseThrow(() -> new AuthException(AuthErrorCode.EXPIRED_REFRESH_TOKEN));

        if (!storedToken.equals(refreshToken)) {
            throw new AuthException(AuthErrorCode.INVALID_REFRESH_TOKEN);
        }

        // 3. Lookup member and validate status (정지/탈퇴 회원의 토큰 재발급 차단)
        Member member = memberRepositoryPort.findById(memberId)
            .orElseThrow(() -> new MemberException(MemberErrorCode.NOT_FOUND_MEMBER));
        validateReissuableStatus(member);

        // 4. Issue and rotate tokens — 새 sessionId 로 교체 회전한다. 같은 jti 를 유지하면
        //    iat 가 초 단위라 같은 초 안에서 동일 토큰이 재생성되어 회전이 무력화되기 때문이다.
        //    이전 세션 키는 즉시 삭제되어 회전 전 토큰의 재사용(탈취 재생)이 차단된다.
        //    세션 메타(기기 정보/최초 로그인 시각)는 같은 기기의 연속이므로 이어받는다.
        RefreshSessionMeta meta = jwtTokenStorePort.findSessionMeta(memberId, claims.tokenId())
            .orElseGet(() -> new RefreshSessionMeta(UNKNOWN_DEVICE, LocalDateTime.now()));
        String newSessionId = UUID.randomUUID().toString();
        String newAccessToken = jwtAuthProvider.issueAccessToken(member.id(), member.role());
        String newRefreshToken = jwtAuthProvider.issueRefreshToken(member.id(), newSessionId);
        jwtTokenStorePort.deleteSession(member.id(), claims.tokenId());
        jwtTokenStorePort.save(member.id(), newSessionId, newRefreshToken, meta);

        return JwtTokenReissueInfo.of(newAccessToken, newRefreshToken);
    }

    /** 쿠키의 refresh 토큰에서 세션 아이디를 추출한다. 위조/타인 토큰이면 세션을 건드리지 않는다. */
    private Optional<String> resolveSessionId(long memberId, String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return Optional.empty();
        }
        try {
            RefreshTokenClaims claims = jwtAuthProvider.parseRefreshToken(refreshToken);
            if (claims.memberId() != memberId) {
                log.warn("[JwtTokenProcessor] 로그아웃 쿠키의 refresh 토큰 소유자가 불일치: memberId={}", memberId);
                return Optional.empty();
            }
            return Optional.of(claims.tokenId());
        } catch (SecurityJwtException e) {
            // 만료/위조 refresh — 세션 삭제 없이 진행한다 (만료면 키도 곧/이미 사라진다).
            return Optional.empty();
        }
    }

    /** UA 는 위조 가능한 표시용 문자열이므로 제어문자 제거 + 길이 절단만 한다. */
    private String sanitizeDeviceInfo(String deviceInfo) {
        if (deviceInfo == null || deviceInfo.isBlank()) {
            return UNKNOWN_DEVICE;
        }
        String cleaned = deviceInfo.replaceAll("[\\p{Cntrl}]", " ").trim();
        if (cleaned.isEmpty()) {
            return UNKNOWN_DEVICE;
        }
        return cleaned.length() > DEVICE_INFO_MAX_LENGTH ? cleaned.substring(0, DEVICE_INFO_MAX_LENGTH) : cleaned;
    }

    private void blacklistAccessToken(long memberId, String tokenId) {
        if (tokenId == null || tokenId.isBlank()) {
            log.warn("[JwtTokenProcessor] revoke 요청에 tokenId 누락: memberId={}", memberId);
            return;
        }
        jwtTokenStorePort.saveAccessTokenIdBlacklist(tokenId, jwtAuthProperties.accessExpiration());
    }

    private void validateReissuableStatus(Member member) {
        switch (member.status()) {
            case WITHDRAWN -> {
                jwtTokenStorePort.deleteAllSessions(member.id());
                throw new MemberException(MemberErrorCode.MEMBER_ALREADY_WITHDRAWN);
            }
            case SUSPENDED -> {
                jwtTokenStorePort.deleteAllSessions(member.id());
                throw new MemberException(MemberErrorCode.MEMBER_SUSPENDED);
            }
            case ACTIVE -> {
            } // 정상
        }
    }
}
