package com.followfollowme.bosspickseoul.domainlayer.auth.application.info;

import com.followfollowme.bosspickseoul.domainlayer.auth.application.model.OAuthConsentSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.query.OAuthMemberQueryResult;

/**
 * 콜백 한 건에서 확보한 것 전부 — provider 가 준 프로필과, state 에 묶여 있던 동의(인가 시점의 판·시각 포함).
 *
 * <p>둘을 한 덩어리로 돌려주는 이유는 state 소비가 일회성이라서다. 동의는 state 를 소비하는 순간에만 꺼낼 수 있고,
 * 다음 단계(회원 조회/생성)는 별도 트랜잭션이라 다시 읽을 방법이 없다. 그렇다고 {@link OAuthMemberQueryResult} 에 동의를
 * 끼워 넣으면 "provider 가 준 값" 과 "우리가 보관하던 값" 이 한 타입에 섞인다.
 */
public record OAuthCallbackInfo(OAuthMemberQueryResult member, OAuthConsentSnapshot consent) {

}
