package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.metrics;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.global.properties.DatasetRefreshProperties;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;

/** 꺼진 인스턴스가 0 값 게이지를 내보내면 "run 이 26시간 넘게 안 돌았다" 알람이 바로 울린다. */
class MicrometerDatasetRefreshMetricsAdapterTest {

    private final SimpleMeterRegistry registry = new SimpleMeterRegistry();

    private MicrometerDatasetRefreshMetricsAdapter adapter(boolean enabled) {
        StaticListableBeanFactory beans = new StaticListableBeanFactory();
        beans.addBean("meterRegistry", registry);
        return new MicrometerDatasetRefreshMetricsAdapter(beans.getBeanProvider(MeterRegistry.class),
            new DatasetRefreshProperties(enabled, null, false, null, null, 600, 1, 0.2, 7, null));
    }

    @Test
    void disabledInstanceDoesNotExposeTheLastRunGauge() {
        adapter(false);

        assertThat(registry.find("batch.dataset.refresh.last.run.epoch").gauge()).isNull();
    }

    @Test
    void enabledInstanceExposesTheLastRunTimeAndCounters() {
        MicrometerDatasetRefreshMetricsAdapter adapter = adapter(true);

        assertThat(registry.get("batch.dataset.refresh.last.run.epoch").gauge().value()).as("첫 run 전에는 0").isZero();
        adapter.runFinished(Instant.ofEpochSecond(1_790_000_000L));
        adapter.slot(Dataset.SALES_COMMERCIAL, DatasetRefreshResult.WOULD_PUBLISH);
        adapter.apiCalls(23);

        assertThat(registry.get("batch.dataset.refresh.last.run.epoch").gauge().value()).isEqualTo(1_790_000_000d);
        assertThat(registry.get("batch.dataset.refresh.slots").tag("dataset", "SALES_COMMERCIAL").tag("result", "WOULD_PUBLISH")
            .counter().count()).isEqualTo(1d);
        assertThat(registry.get("batch.dataset.refresh.api.calls").counter().count()).isEqualTo(23d);
    }
}
