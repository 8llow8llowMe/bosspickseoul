package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.request;

/**
 * AI 리포트 요청 기본값의 단일 출처.
 *
 * <p>프로퍼티가 아니라 상수인 이유: 이 값은 {@code @RequestParam(defaultValue = ...)} 와 {@code @Schema} 양쪽에
 * 들어가야 하는데 애노테이션 속성은 컴파일 타임 상수만 받는다. 프로퍼티로 빼면 실제 기본값과 Swagger 문서가
 * 서로 다른 출처를 갖게 되어(문서에는 옛 값, 동작은 새 값) 드리프트가 조용히 생긴다.
 * 기본 분기 코드는 환경별로 다르게 켜고 끄는 운영 설정이 아니라 공개 API 계약의 일부라 상수가 맞다.
 */
public final class AiReportRequestDefaults {

    /** 적재된 상권 데이터의 최신 분기. 데이터 적재 분기가 올라가면 이 상수만 바꾼다. */
    public static final String PERIOD_CODE = "20233";

    private AiReportRequestDefaults() {
    }
}
