package com.followfollowme.bosspickseoul.domainlayer.policy.domain.enums;

/**
 * 정책 행의 수집 원천. 공개 API 에는 내려가지 않고, 적재·만료 Job 만 본다.
 */
public enum PolicySource {

    /** 수동 시드. 기업마당 stale-mark / purge 대상이 아니다. */
    SEED,
    /** 기업마당 지원사업 API. */
    BIZINFO
}
