package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.store;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportCachePort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportJobEventPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiUsageCounterPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.processor.AiReportJobProcessor;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.processor.AiReportProcessor;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.worker.AiReportWorker;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobType;
import com.followfollowme.bosspickseoul.global.properties.AiReportJobProperties;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

@EnabledIfEnvironmentVariable(named = "TEST_REDIS_PORT", matches = "\\d+")
class RedisAiReportJobStoreAdapterIntegrationTest {

    private LettuceConnectionFactory connectionFactory;
    private StringRedisTemplate redis;
    private RedisAiReportJobStoreAdapter store;
    private String prefix;

    @BeforeEach
    void setUp() {
        String host = System.getenv().getOrDefault("TEST_REDIS_HOST", "127.0.0.1");
        connectionFactory = new LettuceConnectionFactory(host, Integer.parseInt(System.getenv("TEST_REDIS_PORT")));
        connectionFactory.afterPropertiesSet();
        redis = new StringRedisTemplate(connectionFactory);
        prefix = "ai-cas-test:" + UUID.randomUUID();
        store = new RedisAiReportJobStoreAdapter(redis,
            new RedisProperties(null, null, null, null, null, null, prefix),
            new AiReportJobProperties(60, 60, 30, 300), new ObjectMapper().findAndRegisterModules());
    }

    @AfterEach
    void tearDown() {
        try {
            var keys = redis.keys(prefix + ":*");
            if (keys != null && !keys.isEmpty()) {
                redis.delete(keys);
            }
        } finally {
            connectionFactory.destroy();
        }
    }

    @Test
    void concurrentReservations_returnOneOwnerAndStaleReleasePreservesNewOwner() throws Exception {
        try (var executor = Executors.newFixedThreadPool(12)) {
            CountDownLatch start = new CountDownLatch(1);
            List<Future<String>> owners = new ArrayList<>();
            for (int i = 0; i < 12; i++) {
                String id = "job-" + i;
                store.save(pending(id));
                owners.add(executor.submit(() -> {
                    start.await();
                    return store.reserveOrGetExistingJobId(7L, "hash", id);
                }));
            }
            start.countDown();
            String owner = owners.getFirst().get(10, TimeUnit.SECONDS);
            for (Future<String> result : owners) {
                assertThat(result.get(10, TimeUnit.SECONDS)).isEqualTo(owner);
            }
            assertThat(store.findById(owner)).isPresent();
            store.releaseIdempotencyKey(7L, "hash", owner);
            store.save(pending("replacement"));
            assertThat(store.reserveOrGetExistingJobId(7L, "hash", "replacement")).isEqualTo("replacement");
            store.releaseIdempotencyKey(7L, "hash", owner);
            assertThat(store.reserveOrGetExistingJobId(7L, "hash", "other")).isEqualTo("replacement");
        }
    }

    @Test
    void completionAndTimeoutRace_hasOneWinnerAndCannotResurrectMissingJob() throws Exception {
        AiReportJob running = pending("job").withStatus(AiReportJobStatus.RUNNING, Instant.now());
        store.save(running);
        AiReportJob completed = running.withStatus(AiReportJobStatus.COMPLETED, Instant.now());
        AiReportJob failed = running.failed("AI_009", "timeout", Instant.now());
        try (var executor = Executors.newFixedThreadPool(2)) {
            CountDownLatch start = new CountDownLatch(1);
            Future<Boolean> completion = executor.submit(() -> {
                start.await();
                return store.saveIfStatus(completed, AiReportJobStatus.RUNNING);
            });
            Future<Boolean> timeout = executor.submit(() -> {
                start.await();
                return store.saveIfStatus(failed, AiReportJobStatus.RUNNING);
            });
            start.countDown();
            boolean completionWon = completion.get(10, TimeUnit.SECONDS);
            assertThat(timeout.get(10, TimeUnit.SECONDS)).isNotEqualTo(completionWon);
            assertThat(store.findById("job").orElseThrow().status())
                .isEqualTo(completionWon ? AiReportJobStatus.COMPLETED : AiReportJobStatus.FAILED);
            assertThat(store.saveIfStatus(running, AiReportJobStatus.PENDING)).isFalse();
            assertThat(redis.getExpire(prefix + ":ai:job:job")).isBetween(1L, 60L);
            store.deleteJob("job");
            assertThat(store.saveIfStatus(completed, AiReportJobStatus.RUNNING)).isFalse();
            assertThat(store.findById("job")).isEmpty();
        }
    }

    @Test
    void terminalCommitWithLostReply_pollRepairsReservationWithoutDeletingReplacement() {
        store.save(pending("job"));
        store.reserveOrGetExistingJobId(7L, "hash", "job");
        RedisAiReportJobStoreAdapter uncertainStore = spy(store);
        doAnswer(invocation -> {
            invocation.callRealMethod();
            throw new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE);
        }).when(uncertainStore).saveIfStatus(any(), eq(AiReportJobStatus.RUNNING));
        AiReportProcessor generator = mock(AiReportProcessor.class);
        when(generator.generateCommercialReport(any(), any(), any()))
            .thenThrow(new AiReportException(AiReportErrorCode.LLM_UNAVAILABLE));
        AiReportJobEventPort events = mock(AiReportJobEventPort.class);
        AiUsageCounterPort usage = mock(AiUsageCounterPort.class);
        AiReportWorker worker = new AiReportWorker(uncertainStore, events, generator, usage);

        assertThatThrownBy(() -> worker.runJob("job")).isInstanceOf(AiReportException.class);
        assertThat(store.findById("job").orElseThrow().status()).isEqualTo(AiReportJobStatus.FAILED);
        assertThat(store.reserveOrGetExistingJobId(7L, "hash", "replacement")).isEqualTo("job");

        AiReportJobProcessor processor = new AiReportJobProcessor(store, mock(AiReportCachePort.class), events,
            worker, usage, new AiReportJobProperties(60, 60, 30, 300));
        assertThat(processor.getJobInfo("job", 7L).status()).isEqualTo(AiReportJobStatus.FAILED);
        store.save(pending("replacement"));
        assertThat(store.reserveOrGetExistingJobId(7L, "hash", "replacement")).isEqualTo("replacement");
        processor.getJobInfo("job", 7L);
        assertThat(store.reserveOrGetExistingJobId(7L, "hash", "other")).isEqualTo("replacement");
    }

    private AiReportJob pending(String id) {
        return AiReportJob.builder().jobId(id).memberId(7L).jobType(AiReportJobType.COMMERCIAL)
            .requestHash("hash").requestParams(Map.of("commercialCode", "C"))
            .status(AiReportJobStatus.PENDING).createdAt(Instant.now()).build();
    }
}
