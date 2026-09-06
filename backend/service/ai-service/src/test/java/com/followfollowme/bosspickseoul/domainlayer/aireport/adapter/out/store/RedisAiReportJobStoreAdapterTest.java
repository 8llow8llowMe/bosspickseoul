package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.store;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.bosspickseoul.global.properties.AiReportJobProperties;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import org.junit.jupiter.api.Test;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

class RedisAiReportJobStoreAdapterTest {

    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final RedisAiReportJobStoreAdapter store = new RedisAiReportJobStoreAdapter(redis,
        new RedisProperties(null, null, null, null, null, null, "test"),
        new AiReportJobProperties(60, 60, 30, 300), new ObjectMapper());

    @Test
    void nullCasResult_isStorageFailureRatherThanLostRace() {
        assertUnavailable(() -> store.saveIfStatus(
            AiReportJob.builder().jobId("job").status(AiReportJobStatus.RUNNING).build(), AiReportJobStatus.PENDING));
    }

    @Test
    void reservationCommandTimeout_isTranslatedToStorageFailure() {
        when(redis.execute(any(RedisScript.class), anyList(), anyString(), anyString()))
            .thenThrow(new QueryTimeoutException("redis timeout"));

        assertUnavailable(() -> store.reserveOrGetExistingJobId(7L, "hash", "job"));
    }

    private void assertUnavailable(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(AiReportException.class,
            exception -> assertThat(exception.getErrorCode()).isEqualTo(AiReportErrorCode.JOB_STORE_UNAVAILABLE));
    }
}
