package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.request;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;

/**
 * AI 리포트 요청 기본값의 단일 출처.
 *
 * <p>기본 분기는 {@link AnalysisPeriodDefaults} 와 같다.
 */
public final class AiReportRequestDefaults {

    /** 적재된 상권 데이터의 최신 분기. */
    public static final String PERIOD_CODE = AnalysisPeriodDefaults.PERIOD_CODE;

    private AiReportRequestDefaults() {
    }
}
