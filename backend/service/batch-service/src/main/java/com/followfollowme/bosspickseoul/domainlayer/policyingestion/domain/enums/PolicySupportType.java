package com.followfollowme.bosspickseoul.domainlayer.policyingestion.domain.enums;

/**
 * commercial-service {@code PolicySupportType} 과 같은 5종. 수집 단계에서 정규화해 VARCHAR 로 저장한다.
 * 공유 모듈로 올리지 않는다 — 정책 유형은 단일 도메인 개념이다.
 */
public enum PolicySupportType {

    FUNDING,
    SUBSIDY,
    EDUCATION,
    FACILITY,
    MARKETING
}
