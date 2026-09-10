package com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PolicyIngestionErrorCode {

    SOURCE_FETCH_FAILED("POLICY_INGEST_001", "기업마당 정책 원천을 읽지 못했습니다. (%s)"),
    SOURCE_KEY_MISSING("POLICY_INGEST_002", "기업마당 API 키가 없습니다. BIZINFO_CRTFC_KEY 를 설정하세요.");

    private final String code;
    private final String message;
}
