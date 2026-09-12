package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.request;

/**
 * AI 리포트 요청 기본값의 단일 출처.
 *
 * <p>프로퍼티가 아니라 상수인 이유: 기본 분기 코드는 환경별로 켜고 끄는 운영 설정이 아니라 모든 환경에서
 * 같아야 하는 공개 API 계약값이다. 이 값은 {@code @RequestParam(defaultValue = ...)} 와 {@code @Schema} 양쪽에
 * 들어가므로, 한 상수로 묶어야 실제 기본값과 Swagger 문서가 갈라지지 않는다.
 *
 * <p>기술적 제약 때문은 아니다. 애노테이션 속성에도 {@code ${...}} 플레이스홀더를 넣으면 스프링이
 * {@code AbstractNamedValueMethodArgumentResolver} 에서 해석해 주므로 프로퍼티화 자체는 가능하다.
 * 할 수 없어서가 아니라 하지 않기로 한 선택이다.
 */
public final class AiReportRequestDefaults {

    /** 적재된 상권 데이터의 최신 분기. 데이터 적재 분기가 올라가면 이 상수만 바꾼다. */
    public static final String PERIOD_CODE = "20233";

    private AiReportRequestDefaults() {
    }
}
