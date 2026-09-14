package com.followfollowme.bosspickseoul.domainlayer.ranking.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.ranking.application.port.out.AnalysisViewEventPort;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.enums.AnalysisAreaType;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.model.AnalysisViewEvent;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 분석 화면 조회 이벤트를 발행한다.
 *
 * <p>예전에는 자치구 · 행정동 · 상권 세 Facade 가 {@link AnalysisViewEventPort} 를 각자 직접 잡고
 * 발행했다. 포트 호출은 Processor 책임이라는 경계가 무너져 있었고, 이벤트 시각을 Facade 에서
 * {@code LocalDateTime.now()} 로 만들고 있어 테스트에서 고정할 수단도 없었다. 발행 조건이
 * 하나라도 붙으면(중복 억제, 비로그인 제외 등) 그 판단이 세 Facade 에 복제될 자리이기도 했다.
 *
 * <p>시각은 주입받은 {@link Clock} 으로 만든다. batch-service 의
 * {@code PolicyPurgeProcessor} 가 쓰는 것과 같은 방식이다.
 *
 * <p>{@link AnalysisViewEventPort} 는 계약상 어떤 상황에서도 예외를 던지지 않는다. 인기 순위는
 * 부가 기능이므로 브로커 장애가 분석 API 응답에 영향을 주면 안 된다. 그 계약을 지키는 쪽은
 * 어댑터이고({@code KafkaAnalysisViewEventAdapter}) 테스트도 그쪽에 있다. 여기에 방어적
 * try-catch 를 두면 계약이 두 곳으로 흩어지므로 두지 않는다.
 *
 * <p>호출부는 읽기 트랜잭션 안이다. 그대로 두는 이유는 발행이 비동기 {@code send()} 이고
 * 브로커 불능 시 블로킹이 producer 의 {@code max.block.ms}(1초, application.yml)로 상한이
 * 잡혀 있어 커넥션 점유가 유계이기 때문이다. <b>발행이 동기로 바뀌거나 그 설정이 사라지면 이
 * 판단은 무효가 된다.</b> 그때는 커밋 후 발행으로 옮겨야 한다.
 */
@Service
@RequiredArgsConstructor
public class AnalysisViewPublishProcessor {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final AnalysisViewEventPort analysisViewEventPort;
    private final Clock clock;

    public void publishView(AnalysisAreaType areaType, String areaCode, String areaName) {
        analysisViewEventPort.publish(new AnalysisViewEvent(
            areaType,
            areaCode,
            areaName,
            LocalDateTime.ofInstant(clock.instant(), SEOUL)
        ));
    }
}
