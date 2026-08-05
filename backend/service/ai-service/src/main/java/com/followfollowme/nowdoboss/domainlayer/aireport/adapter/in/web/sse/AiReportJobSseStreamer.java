package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.sse;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.presenter.AiReportPresenter;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AiReportJobSubscription;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.in.AiReportWebUseCase;
import com.followfollowme.nowdoboss.global.properties.AiReportJobProperties;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * AI 리포트 잡 상태를 SSE 로 스트리밍한다.
 * 구독 즉시 현재 상태 스냅샷을 보내고, 이후 상태 변경 이벤트를 밀어주며, 종결 상태에서 연결을 닫는다.
 * 하트비트가 프록시 유휴 타임아웃을 막는 동시에 상태를 재확인하므로 pub/sub 이벤트가 유실돼도 스트림은 종결된다.
 */
@Slf4j
@Component
public class AiReportJobSseStreamer {

    private static final String EVENT_NAME = "job-update";
    private static final long HEARTBEAT_INTERVAL_SECONDS = 25L;
    private static final long EMITTER_TIMEOUT_MARGIN_SECONDS = 30L;

    private final AiReportWebUseCase aiReportWebUseCase;
    private final AiReportPresenter aiReportPresenter;
    private final long emitterTimeoutMs;
    private final ScheduledExecutorService heartbeatScheduler;

    public AiReportJobSseStreamer(
        AiReportWebUseCase aiReportWebUseCase, AiReportPresenter aiReportPresenter, AiReportJobProperties jobProperties
    ) {
        this.aiReportWebUseCase = aiReportWebUseCase;
        this.aiReportPresenter = aiReportPresenter;
        // 잡이 살아있을 수 있는 최대 시간(대기 + 실행 타임아웃)보다 길게 잡을 이유가 없다.
        this.emitterTimeoutMs = TimeUnit.SECONDS.toMillis(
            jobProperties.pendingTimeoutSeconds() + jobProperties.runningTimeoutSeconds() + EMITTER_TIMEOUT_MARGIN_SECONDS
        );
        this.heartbeatScheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "ai-report-sse-heartbeat");
            thread.setDaemon(true);
            return thread;
        });
    }

    public SseEmitter stream(String jobId, long memberId) {
        // 소유권 검증과 초기 스냅샷 확보. 실패(JOB_NOT_FOUND 등)는 SSE 시작 전이므로 일반 JSON 오류로 응답된다.
        AiReportJobInfo initial = aiReportWebUseCase.getJobInfo(jobId, memberId);

        SseEmitter emitter = new SseEmitter(emitterTimeoutMs);
        if (initial.status().isTerminal()) {
            sendQuietly(emitter, initial);
            emitter.complete();
            return emitter;
        }

        AtomicBoolean closed = new AtomicBoolean(false);
        AtomicReference<AiReportJobSubscription> subscriptionRef = new AtomicReference<>();
        AtomicReference<ScheduledFuture<?>> heartbeatRef = new AtomicReference<>();
        Runnable cleanup = () -> {
            if (!closed.compareAndSet(false, true)) {
                return;
            }
            AiReportJobSubscription subscription = subscriptionRef.get();
            if (subscription != null) {
                subscription.unsubscribe();
            }
            ScheduledFuture<?> heartbeat = heartbeatRef.get();
            if (heartbeat != null) {
                heartbeat.cancel(false);
            }
        };
        emitter.onCompletion(cleanup);
        emitter.onError(throwable -> cleanup.run());
        emitter.onTimeout(() -> {
            cleanup.run();
            emitter.complete();
        });

        // 스냅샷 전송 전에 구독을 먼저 걸어 그 사이의 상태 전이를 놓치지 않는다.
        subscriptionRef.set(aiReportWebUseCase.subscribeJobUpdates(
            jobId, memberId, info -> forward(emitter, info, cleanup)
        ));
        heartbeatRef.set(heartbeatScheduler.scheduleAtFixedRate(
            () -> heartbeat(emitter, jobId, memberId, closed, cleanup),
            HEARTBEAT_INTERVAL_SECONDS, HEARTBEAT_INTERVAL_SECONDS, TimeUnit.SECONDS
        ));

        forward(emitter, initial, cleanup);
        return emitter;
    }

    private void forward(SseEmitter emitter, AiReportJobInfo info, Runnable cleanup) {
        if (!sendQuietly(emitter, info)) {
            cleanup.run();
            return;
        }
        if (info.status().isTerminal()) {
            cleanup.run();
            emitter.complete();
        }
    }

    /**
     * 연결 유지용 코멘트를 보내고 상태를 재확인한다.
     * 재확인은 유실된 종결 이벤트를 복구하고, 멈춘 잡을 타임아웃 처리(expire)하는 폴백 역할을 한다.
     */
    private void heartbeat(SseEmitter emitter, String jobId, long memberId, AtomicBoolean closed, Runnable cleanup) {
        if (closed.get()) {
            return;
        }
        try {
            synchronized (emitter) {
                emitter.send(SseEmitter.event().comment("ping"));
            }
            AiReportJobInfo current = aiReportWebUseCase.getJobInfo(jobId, memberId);
            if (current.status().isTerminal()) {
                forward(emitter, current, cleanup);
            }
        } catch (IOException | RuntimeException exception) {
            log.debug("AI 리포트 SSE 하트비트 중 연결을 정리합니다. jobId={} reason={}", jobId, exception.getMessage());
            cleanup.run();
        }
    }

    private boolean sendQuietly(SseEmitter emitter, AiReportJobInfo info) {
        try {
            synchronized (emitter) {
                emitter.send(SseEmitter.event()
                    .name(EVENT_NAME)
                    .data(aiReportPresenter.toJobStatusResponse(info), MediaType.APPLICATION_JSON));
            }
            return true;
        } catch (IOException | IllegalStateException exception) {
            // 클라이언트가 먼저 연결을 끊은 경우가 대부분이라 경고로 남기지 않는다.
            log.debug("AI 리포트 SSE 전송에 실패했습니다. jobId={} reason={}", info.jobId(), exception.getMessage());
            return false;
        }
    }

    @PreDestroy
    void shutdown() {
        heartbeatScheduler.shutdownNow();
    }
}
