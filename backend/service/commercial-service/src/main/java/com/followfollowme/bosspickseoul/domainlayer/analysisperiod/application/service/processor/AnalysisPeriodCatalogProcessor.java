package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodException;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.model.AnalysisPeriodCatalog;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.port.out.AnalysisDatasetPeriodQueryPort;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 분석 기준 분기의 유일한 해석 지점(이슈 #464). 다른 컨텍스트의 Facade 는 {@link #resolve(String)} 만 부른다.
 *
 * <p><b>요청 경로는 DB 를 치지 않는다.</b> {@link #resolve(String)}·{@link #catalog()} 는 인스턴스 메모리의 마지막 성공 카탈로그만
 * 읽는다. 재계산은 {@link #refresh()} 하나이고 스케줄러({@code AnalysisPeriodCatalogRefreshScheduler})만 부른다. 요청이 재계산을
 * 기다리면 분석 Facade 의 readOnly 트랜잭션이 쥔 커넥션을 놓지 않은 채 줄을 서고, 재계산은 커넥션을 하나 더 요구해 풀이
 * 고갈된다(동시 10건이면 Hikari 기본 10개가 30초 정지 뒤 전부 실패).
 *
 * <p>카탈로그가 아직 없거나(기동 직후 첫 갱신 전, 첫 갱신 실패) 기본 분기가 없으면 분기를 생략한 요청은 기다리지 않고 바로 503 이다.
 * 예시 상수로 조용히 떨어지면 적재되지 않은 분기를 기본으로 내보내 화면 전체가 "데이터 없음"이 되므로 폴백 값을 두지 않는다.
 * 갱신이 실패하면 이 Processor 는 아무것도 바꾸지 않으므로 마지막 성공값이 그대로 남는다.
 */
@Slf4j
@Component
public class AnalysisPeriodCatalogProcessor {

    /** 기본 분기가 가장 앞선 핵심 데이터셋보다 이만큼 이상 뒤처지면 WARN 을 남긴다. 적재 한 번 밀린 것은 정상 범위다. */
    private static final int LAGGING_WARN_QUARTERS = 2;
    private static final Pattern PERIOD_CODE = Pattern.compile("^\\d{4}[1-4]$");

    private final AnalysisDatasetPeriodQueryPort analysisDatasetPeriodQueryPort;
    private final DatasetSpatialVersion datasetSpatialVersion;
    private final Clock clock;

    private final AtomicReference<AnalysisPeriodCatalog> current = new AtomicReference<>();
    /** 마지막으로 WARN 을 남긴 이상 상태. 같은 상태가 갱신마다 반복되면 다시 찍지 않고, 바뀌거나 풀렸다 재발하면 찍는다. */
    private final AtomicReference<String> lastWarnedAnomaly = new AtomicReference<>();

    public AnalysisPeriodCatalogProcessor(
        AnalysisDatasetPeriodQueryPort analysisDatasetPeriodQueryPort, DatasetSpatialVersion datasetSpatialVersion, Clock clock
    ) {
        this.analysisDatasetPeriodQueryPort = analysisDatasetPeriodQueryPort;
        this.datasetSpatialVersion = datasetSpatialVersion;
        this.clock = clock;
    }

    /**
     * 마지막 성공 카탈로그. 캐시만 읽는다.
     *
     * @throws AnalysisPeriodException 아직 한 번도 계산하지 못했을 때(503)
     */
    public AnalysisPeriodCatalog catalog() {
        AnalysisPeriodCatalog catalog = current.get();
        if (catalog == null) {
            throw new AnalysisPeriodException(AnalysisPeriodErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
        }
        return catalog;
    }

    /** 마지막 성공 카탈로그의 계산 시각. 갱신 실패 로그가 "얼마나 오래된 값을 내고 있는지" 남기는 데 쓴다. */
    public Optional<OffsetDateTime> lastResolvedAt() {
        return Optional.ofNullable(current.get()).map(AnalysisPeriodCatalog::resolvedAt);
    }

    /**
     * 요청 분기를 해석한다. 값이 있으면 그대로 쓰고(형식 검증은 각 조회 경로가 한다), 비었으면 캐시된 기본 분기를 쓴다. DB 를 치지 않는다.
     *
     * @throws AnalysisPeriodException 기본 분기를 정할 수 없을 때(503) — 카탈로그 없음, 핵심 데이터셋 공통 분기 없음
     */
    public String resolve(String requestedPeriodCode) {
        if (requestedPeriodCode != null && !requestedPeriodCode.isBlank()) {
            return requestedPeriodCode;
        }
        AnalysisPeriodCatalog catalog = current.get();
        if (catalog == null || catalog.defaultPeriodCode() == null) {
            throw new AnalysisPeriodException(AnalysisPeriodErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
        }
        return catalog.defaultPeriodCode();
    }

    /**
     * 카탈로그를 다시 계산해 바꿔 끼운다. 스케줄러 전용이다.
     *
     * <p>포트가 던지는 예외(포트 Javadoc 의 실패 계약)는 그대로 올려 보낸다. 이때 캐시는 바뀌지 않아 마지막 성공값이 유지되고,
     * 호출한 스케줄러가 잡아 WARN 을 남긴다. 그래서 이 Processor 는 어댑터의 트랜잭션·예외 유형을 알 필요가 없다.
     */
    public AnalysisPeriodCatalog refresh() {
        String spatialVersion = datasetSpatialVersion.value();
        AnalysisPeriodCatalog catalog = AnalysisPeriodCatalog.of(spatialVersion,
            analysisDatasetPeriodQueryPort.findPeriodCodesByDataset(spatialVersion), OffsetDateTime.now(clock));
        AnalysisPeriodCatalog previous = current.getAndSet(catalog);
        logDefaultChange(previous, catalog);
        logAnomaly(catalog);
        return catalog;
    }

    private void logDefaultChange(AnalysisPeriodCatalog previous, AnalysisPeriodCatalog catalog) {
        String from = previous == null ? null : previous.defaultPeriodCode();
        String to = catalog.defaultPeriodCode();
        if (previous == null || !Objects.equals(from, to)) {
            log.info("[analysis-period] default changed from={} to={} spatialVersion={} lagging={}",
                from, to, catalog.spatialVersion(), catalog.laggingDatasets());
        }
    }

    /**
     * 공통 분기 없음·기본 분기 정체는 기본 분기가 바뀌지 않는 채로 이어지는 상태라 갱신마다 평가한다. 같은 상태(뒤처진 데이터셋 집합과
     * 지연 분기 수)가 반복되면 다시 찍지 않는다. 상태가 풀리면 기록을 지워 재발할 때 다시 찍는다.
     */
    private void logAnomaly(AnalysisPeriodCatalog catalog) {
        String defaultPeriodCode = catalog.defaultPeriodCode();
        if (defaultPeriodCode == null) {
            warnOnce("no-common:" + catalog.laggingDatasets(), () -> log.warn(
                "[analysis-period] no common period across core datasets spatialVersion={} lagging={}",
                catalog.spatialVersion(), catalog.laggingDatasets()));
            return;
        }
        String newest = catalog.newestCorePeriodCode();
        int lag = quarterLag(newest, defaultPeriodCode);
        if (lag < LAGGING_WARN_QUARTERS) {
            lastWarnedAnomaly.set(null);
            return;
        }
        warnOnce("lag:" + lag + ":" + catalog.laggingDatasets(), () -> log.warn(
            "[analysis-period] default lags newest core dataset default={} newest={} quarters={} lagging={}",
            defaultPeriodCode, newest, lag, catalog.laggingDatasets()));
    }

    private void warnOnce(String anomaly, Runnable warning) {
        if (!anomaly.equals(lastWarnedAnomaly.getAndSet(anomaly))) {
            warning.run();
        }
    }

    /** 두 분기 사이의 분기 수. 형식이 어긋난 코드(원천 오염)면 0 으로 보고 판정하지 않는다. */
    private static int quarterLag(String newest, String defaultPeriodCode) {
        if (newest == null || !PERIOD_CODE.matcher(newest).matches() || !PERIOD_CODE.matcher(defaultPeriodCode).matches()) {
            return 0;
        }
        return quarterIndex(newest) - quarterIndex(defaultPeriodCode);
    }

    private static int quarterIndex(String periodCode) {
        return Integer.parseInt(periodCode.substring(0, 4)) * 4 + (periodCode.charAt(4) - '1');
    }
}
