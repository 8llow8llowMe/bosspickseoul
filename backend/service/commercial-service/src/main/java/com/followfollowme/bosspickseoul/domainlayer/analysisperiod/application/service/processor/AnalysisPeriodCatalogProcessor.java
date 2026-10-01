package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodException;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.model.AnalysisPeriodCatalog;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.port.out.AnalysisDatasetPeriodQueryPort;
import com.followfollowme.bosspickseoul.global.properties.AnalysisPeriodProperties;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.TransactionException;

/**
 * 분석 기준 분기의 유일한 해석 지점(이슈 #464). 다른 컨텍스트의 Facade 는 {@link #resolve(String)} 만 부른다.
 *
 * <p>카탈로그는 인스턴스 메모리에 TTL 동안 둔다. 만료되면 요청 하나만 다시 계산하고 나머지는 기다리지 않고 직전 값을 받는다.
 * 재계산이 DB 오류로 실패하면 마지막 성공 카탈로그를 계속 쓰고 다음 재시도를 TTL 뒤로 미룬다 — 장애 중인 DB 를 요청마다
 * 두드리지 않기 위해서다. 한 번도 계산하지 못했으면(콜드 스타트 장애) 분기를 생략한 요청은 503 이다. 예시 상수로 조용히
 * 떨어지면 적재되지 않은 분기를 기본으로 내보내 화면 전체가 "데이터 없음"이 되므로 폴백 값을 두지 않는다.
 */
@Slf4j
@Component
public class AnalysisPeriodCatalogProcessor {

    /** 기본 분기가 가장 앞선 핵심 데이터셋보다 이만큼 이상 뒤처지면 WARN 을 남긴다. 적재 한 번 밀린 것은 정상 범위다. */
    private static final int LAGGING_WARN_QUARTERS = 2;
    private static final Pattern PERIOD_CODE = Pattern.compile("^\\d{4}[1-4]$");

    private final AnalysisDatasetPeriodQueryPort analysisDatasetPeriodQueryPort;
    private final DatasetSpatialVersion datasetSpatialVersion;
    private final Duration cacheTtl;
    private final Clock clock;

    private final AtomicReference<CachedCatalog> cache = new AtomicReference<>();
    private final ReentrantLock refreshLock = new ReentrantLock();
    /** 콜드 스타트 계산 실패 횟수. 줄 서 있던 요청이 앞 요청의 실패를 같이 받고 DB 를 다시 두드리지 않게 한다. */
    private final AtomicLong coldStartFailures = new AtomicLong();

    public AnalysisPeriodCatalogProcessor(
        AnalysisDatasetPeriodQueryPort analysisDatasetPeriodQueryPort, DatasetSpatialVersion datasetSpatialVersion,
        AnalysisPeriodProperties analysisPeriodProperties, Clock clock
    ) {
        this.analysisDatasetPeriodQueryPort = analysisDatasetPeriodQueryPort;
        this.datasetSpatialVersion = datasetSpatialVersion;
        this.cacheTtl = analysisPeriodProperties.cacheTtl();
        this.clock = clock;
    }

    /** 현재 카탈로그. 만료됐으면 재계산을 시도하고, 계산할 수 없으면 마지막 성공값을 돌려준다. */
    public AnalysisPeriodCatalog catalog() {
        CachedCatalog cached = cache.get();
        if (cached == null) {
            return loadOnColdStart();
        }
        if (!cached.refreshDue(clock.instant()) || !refreshLock.tryLock()) {
            return cached.catalog();
        }
        try {
            CachedCatalog current = cache.get();
            if (!current.refreshDue(clock.instant())) {
                return current.catalog();
            }
            return refresh(current);
        } finally {
            refreshLock.unlock();
        }
    }

    /**
     * 요청 분기를 해석한다. 값이 있으면 그대로 쓰고(형식 검증은 각 조회 경로가 한다), 비었으면 카탈로그의 기본 분기를 쓴다.
     *
     * @throws AnalysisPeriodException 기본 분기를 정할 수 없을 때(503)
     */
    public String resolve(String requestedPeriodCode) {
        if (requestedPeriodCode != null && !requestedPeriodCode.isBlank()) {
            return requestedPeriodCode;
        }
        String defaultPeriodCode = catalog().defaultPeriodCode();
        if (defaultPeriodCode == null) {
            throw new AnalysisPeriodException(AnalysisPeriodErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
        }
        return defaultPeriodCode;
    }

    private AnalysisPeriodCatalog loadOnColdStart() {
        long failuresBeforeWaiting = coldStartFailures.get();
        refreshLock.lock();
        try {
            CachedCatalog current = cache.get();
            if (current != null) {
                return current.catalog();
            }
            if (coldStartFailures.get() != failuresBeforeWaiting) {
                throw new AnalysisPeriodException(AnalysisPeriodErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
            }
            return refresh(null);
        } finally {
            refreshLock.unlock();
        }
    }

    /** {@link #refreshLock} 을 잡은 상태에서만 부른다. */
    private AnalysisPeriodCatalog refresh(CachedCatalog previous) {
        String spatialVersion = datasetSpatialVersion.value();
        try {
            AnalysisPeriodCatalog catalog = AnalysisPeriodCatalog.of(spatialVersion,
                analysisDatasetPeriodQueryPort.findPeriodCodesByDataset(spatialVersion), OffsetDateTime.now(clock));
            logChanges(previous == null ? null : previous.catalog(), catalog);
            cache.set(new CachedCatalog(catalog, clock.instant().plus(cacheTtl)));
            return catalog;
        } catch (DataAccessException | TransactionException exception) {
            // 예외 메시지에는 접속 정보가 섞일 수 있어 유형만 남긴다.
            String error = NestedExceptionUtils.getMostSpecificCause(exception).getClass().getSimpleName();
            if (previous == null) {
                coldStartFailures.incrementAndGet();
                log.warn("[analysis-period] catalog load failed, no catalog to serve spatialVersion={} error={}", spatialVersion, error);
                throw new AnalysisPeriodException(AnalysisPeriodErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
            }
            cache.set(new CachedCatalog(previous.catalog(), clock.instant().plus(cacheTtl)));
            log.warn("[analysis-period] catalog refresh failed, serving stale resolvedAt={} spatialVersion={} error={}",
                previous.catalog().resolvedAt(), spatialVersion, error);
            return previous.catalog();
        }
    }

    private void logChanges(AnalysisPeriodCatalog previous, AnalysisPeriodCatalog current) {
        String from = previous == null ? null : previous.defaultPeriodCode();
        String to = current.defaultPeriodCode();
        if (Objects.equals(from, to)) {
            return;
        }
        log.info("[analysis-period] default changed from={} to={} spatialVersion={} lagging={}",
            from, to, current.spatialVersion(), current.laggingDatasets());
        if (to == null) {
            log.warn("[analysis-period] no common period across core datasets spatialVersion={} lagging={}",
                current.spatialVersion(), current.laggingDatasets());
            return;
        }
        String newest = current.newestCorePeriodCode();
        if (!PERIOD_CODE.matcher(to).matches() || !PERIOD_CODE.matcher(newest).matches()) {
            return;
        }
        int lag = quarterIndex(newest) - quarterIndex(to);
        if (lag >= LAGGING_WARN_QUARTERS) {
            log.warn("[analysis-period] default lags newest core dataset default={} newest={} quarters={} lagging={}",
                to, newest, lag, current.laggingDatasets());
        }
    }

    private static int quarterIndex(String periodCode) {
        return Integer.parseInt(periodCode.substring(0, 4)) * 4 + (periodCode.charAt(4) - '1');
    }

    /** 계산한 카탈로그와 다음 재계산 시각. 재계산이 실패하면 카탈로그는 그대로 두고 시각만 미룬다. */
    private record CachedCatalog(AnalysisPeriodCatalog catalog, Instant refreshAfter) {

        boolean refreshDue(Instant now) {
            return !now.isBefore(refreshAfter);
        }
    }
}
