package com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.auth.application.model.OAuthConsentSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.query.OAuthStateQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.OAuthProvider;
import java.time.Duration;
import java.util.Optional;

/**
 * OAuth 인가 요청의 state(CSRF 방어 일회성 토큰) 저장 계약.
 *
 * <p>state 에 provider 를 함께 저장해 콜백의 provider 바꿔치기까지 차단한다. 소셜 첫 가입 동의도 그 순간의 문서 판·시각과
 * 함께 저장하는데, 인가코드가 1회용이라 콜백 시점에 동의를 새로 받을 수 없기 때문이다({@link OAuthConsentSnapshot} 참고).
 */
public interface OAuthStateStorePort {

    void save(String state, OAuthProvider provider, OAuthConsentSnapshot consent, Duration ttl);

    /**
     * state 를 원자적으로 조회+삭제한다(일회성 보장).
     *
     * @return 저장 시점의 provider 와 동의. state 가 없거나 만료되었으면 empty
     */
    Optional<OAuthStateQueryResult> consume(String state);
}
