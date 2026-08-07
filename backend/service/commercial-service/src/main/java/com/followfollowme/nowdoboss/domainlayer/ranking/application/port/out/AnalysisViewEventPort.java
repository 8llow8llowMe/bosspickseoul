package com.followfollowme.nowdoboss.domainlayer.ranking.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.ranking.domain.model.AnalysisViewEvent;

/**
 * 분석 화면 조회 이벤트 발행 포트.
 *
 * <p><b>계약: 구현체는 어떤 상황에서도 예외를 밖으로 던지지 않는다.</b>
 * 인기 순위는 부가 기능이므로 브로커 장애가 분석 API 응답에 영향을 주면 안 된다.
 * 발행 실패는 구현체 안에서 로그만 남기고 이벤트를 버린다.
 */
public interface AnalysisViewEventPort {

    void publish(AnalysisViewEvent event);
}
