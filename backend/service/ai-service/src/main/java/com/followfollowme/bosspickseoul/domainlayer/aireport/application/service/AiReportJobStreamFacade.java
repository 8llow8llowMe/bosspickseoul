package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AiReportJobSubscription;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.in.AiReportJobStreamUseCase;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.processor.AiReportJobProcessor;
import java.util.function.Consumer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * SSE 스트리밍 인바운드 포트 구현.
 *
 * <p>제출/조회 유스케이스({@link AiReportWebFacade})와 달리 Presenter 를 조합하지 않는다.
 * SSE 는 종결 판정에 도메인 술어가 필요해 {@code Info} 를 그대로 넘기고, Response 변환은 스트림 어댑터가 전송 직전에 수행한다.
 *
 * <p>트랜잭션을 걸지 않는다. 이 경로의 저장소는 Redis 뿐이고 구독은 SSE 연결이 끊길 때까지 살아 있는 장수 핸들이라,
 * 트랜잭션 경계를 씌우면 커넥션을 스트림 수명만큼 붙들게 된다.
 */
@Service
@RequiredArgsConstructor
public class AiReportJobStreamFacade implements AiReportJobStreamUseCase {

    private final AiReportJobProcessor aiReportJobProcessor;

    @Override
    public AiReportJobInfo getJobInfo(String jobId, long memberId) {
        return aiReportJobProcessor.getJobInfo(jobId, memberId);
    }

    @Override
    public AiReportJobSubscription subscribeJobUpdates(String jobId, long memberId, Consumer<AiReportJobInfo> onUpdate) {
        return aiReportJobProcessor.subscribeJobUpdates(jobId, memberId, onUpdate);
    }
}
