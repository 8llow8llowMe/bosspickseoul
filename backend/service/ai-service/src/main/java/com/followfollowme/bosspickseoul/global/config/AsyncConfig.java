package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.global.properties.AiSourceFetchProperties;
import java.util.concurrent.Executor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "aiReportTaskExecutor")
    public Executor aiReportTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // LLM 은 한 번에 하나의 생성만 처리한다(Ollama OLLAMA_NUM_PARALLEL=1).
        // 워커를 늘려도 전부 LLM 앞에서 대기하므로, 스레드는 최소로 두고 대기는 큐가 흡수하게 한다.
        // 스레드를 늘리면 대기 중인 잡이 RUNNING 으로 일찍 전이되어 running-timeout 을 헛되이 소모한다.
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(2);
        // 잡 종류가 4종(상권/상권비교/자치구/행정동)으로 늘어 동시 유입이 많아졌다.
        // 큐가 넘치면 제출이 즉시 거절되므로 여유를 둔다.
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("ai-report-worker-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }

    /**
     * 원천 데이터 fan-out 전용 풀.
     *
     * <p>워커 풀({@code aiReportTaskExecutor})을 재사용하면 안 된다. 리포트 생성은 그 풀의 스레드 위에서 돌고,
     * 그 스레드가 다시 같은 풀에 조회 8건을 제출한 뒤 {@code allOf(...).join()} 으로 기다린다.
     * core=max=2 인 풀에서는 제출된 조회가 영원히 큐에 남아 자기 자신을 기다리는 교착이 된다.
     *
     * <p>{@code ForkJoinPool.commonPool()} 도 쓰지 않는다. parallelism 이 (코어수 - 1) 이라 블로킹 HTTP 로
     * 채우면 JVM 전역 공유 풀이 막히고, Spring 관리 밖이라 {@code executor_*} 메트릭에도 잡히지 않는다.
     *
     * <p>사이징 근거: 동시 실행 잡은 워커 풀 크기만큼(최대 2)이고 한 잡의 최대 fan-out 은 8건(상권 리포트)이라
     * 2 x 8 = 16 이 동시 수요의 상한이다. 전부 Feign 응답을 기다리는 블로킹 I/O 라 CPU 코어 수와 무관하게
     * 스레드를 그만큼 잡아도 된다. core=max 로 고정해 지연 생성 없이 상한을 바로 확보하고,
     * 워커 풀을 키웠을 때 즉시 거절되지 않도록 큐 여유를 둔다.
     */
    @Bean(name = "aiSourceFetchTaskExecutor")
    public Executor aiSourceFetchTaskExecutor(AiSourceFetchProperties properties) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(properties.corePoolSize());
        executor.setMaxPoolSize(properties.maxPoolSize());
        executor.setQueueCapacity(properties.queueCapacity());
        executor.setThreadNamePrefix("ai-source-fetch-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(properties.awaitTerminationSeconds());
        executor.initialize();
        return executor;
    }
}
