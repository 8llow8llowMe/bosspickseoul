package com.followfollowme.nowdoboss.global.config;

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
}
