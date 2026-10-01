package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.metrics;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetRefreshMetricsPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.global.properties.DatasetRefreshProperties;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

/**
 * Prometheus 에서는 {@code batch_dataset_refresh_api_calls_total}, {@code batch_dataset_refresh_slots_total{dataset,result}},
 * {@code batch_dataset_refresh_service_type_unresolved_rows_total{dataset}}, {@code batch_dataset_refresh_last_run_epoch} 로 보인다.
 * 레지스트리 빈이 없으면(슬라이스 테스트 등) 아무것도 하지 않는다. 태그 값은 enum 이름이라 카디널리티가 고정이다.
 *
 * <p>{@code last_run_epoch} 게이지는 자동 최신화가 켜진 인스턴스에만 등록한다. 꺼진 인스턴스(prod 등)나 켠 직후 첫 run 전에는 값이
 * 0 이라, 알람식 {@code time() - x > 26h} 가 바로 울린다. 켠 인스턴스에서도 첫 run 전 0 은 남으므로 알람식에
 * {@code and batch_dataset_refresh_last_run_epoch > 0} 을 붙인다(observability-guide.md).
 */
@Component
public class MicrometerDatasetRefreshMetricsAdapter implements DatasetRefreshMetricsPort {

    private final MeterRegistry registry;
    private final AtomicLong lastRunEpoch = new AtomicLong();

    public MicrometerDatasetRefreshMetricsAdapter(ObjectProvider<MeterRegistry> registry, DatasetRefreshProperties properties) {
        this.registry = registry.getIfAvailable();
        if (this.registry != null && properties.enabled()) {
            Gauge.builder("batch.dataset.refresh.last.run.epoch", lastRunEpoch, AtomicLong::get)
                .description("Epoch seconds when the last dataset refresh run finished")
                .register(this.registry);
        }
    }

    @Override
    public void apiCalls(int calls) {
        if (registry != null && calls > 0) {
            Counter.builder("batch.dataset.refresh.api.calls").description("Seoul Open API calls made by dataset refresh")
                .register(registry).increment(calls);
        }
    }

    @Override
    public void slot(Dataset dataset, DatasetRefreshResult result) {
        if (registry != null) {
            Counter.builder("batch.dataset.refresh.slots").description("Dataset refresh decisions")
                .tag("dataset", dataset.name()).tag("result", result.name())
                .register(registry).increment();
        }
    }

    @Override
    public void serviceTypeUnresolved(Dataset dataset, long rows) {
        if (registry != null && rows > 0) {
            Counter.builder("batch.dataset.refresh.service.type.unresolved.rows")
                .description("Projected rows whose service_type could not be resolved")
                .tag("dataset", dataset.name()).register(registry).increment(rows);
        }
    }

    @Override
    public void runFinished(Instant finishedAt) {
        lastRunEpoch.set(finishedAt.getEpochSecond());
    }
}
