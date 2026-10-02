package com.followfollowme.bosspickseoul.support;

import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.AnalysisPeriodQueryPort;
import java.util.Optional;

/**
 * 기본 분기 포트 스텁. 고정 기본 분기를 주거나({@link #fixed}), 받지 못한 상태(MAP_011)를 흉내 낸다({@link #unavailable}).
 * {@link #explicitOnly()} 는 해석을 부르면 실패해, 분기를 명시한 요청이 기본 분기를 묻지 않는지 확인할 때 쓴다.
 */
public final class StubAnalysisPeriodQueryPort implements AnalysisPeriodQueryPort {

    private final String defaultPeriodCode;
    private final boolean failOnUse;
    private int defaultPeriodCalls;

    private StubAnalysisPeriodQueryPort(String defaultPeriodCode, boolean failOnUse) {
        this.defaultPeriodCode = defaultPeriodCode;
        this.failOnUse = failOnUse;
    }

    public static StubAnalysisPeriodQueryPort fixed(String defaultPeriodCode) {
        return new StubAnalysisPeriodQueryPort(defaultPeriodCode, false);
    }

    /** 기본 분기를 받지 못했고 받아 둔 값도 없다. */
    public static StubAnalysisPeriodQueryPort unavailable() {
        return new StubAnalysisPeriodQueryPort(null, false);
    }

    /** 기본 분기를 물으면 테스트를 실패시킨다. */
    public static StubAnalysisPeriodQueryPort explicitOnly() {
        return new StubAnalysisPeriodQueryPort(null, true);
    }

    public int defaultPeriodCalls() {
        return defaultPeriodCalls;
    }

    @Override
    public String defaultPeriodCode() {
        defaultPeriodCalls++;
        if (failOnUse) {
            throw new AssertionError("explicit periodCode must not be resolved");
        }
        if (defaultPeriodCode == null) {
            throw new MapException(MapErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
        }
        return defaultPeriodCode;
    }

    @Override
    public Optional<String> lastKnownDefaultPeriodCode() {
        if (failOnUse) {
            throw new AssertionError("explicit periodCode must not be resolved");
        }
        return Optional.ofNullable(defaultPeriodCode);
    }
}
