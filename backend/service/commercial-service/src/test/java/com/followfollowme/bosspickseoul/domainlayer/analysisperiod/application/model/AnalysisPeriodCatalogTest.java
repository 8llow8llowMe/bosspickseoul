package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.model;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 기본 분기 = 원천 중단 상한이 없는 데이터셋 전부에 적재된 분기 중 최신(이슈 #464).
 * 한 데이터셋이라도 빈 분기를 기본으로 잡으면 그 화면이 404 가 되므로 교집합이어야 한다.
 */
class AnalysisPeriodCatalogTest {

    private static final String SPATIAL_VERSION = "legacy-20233";
    private static final OffsetDateTime RESOLVED_AT = OffsetDateTime.parse("2026-10-01T05:12:03+09:00");

    @Test
    @DisplayName("기본 분기는 핵심 데이터셋 교집합의 최신 분기이고 목록은 최신순이다")
    void defaultIsTheNewestPeriodCommonToEveryCoreDataset() {
        Map<DatasetKey, Set<String>> periods = allCore(Set.of("20254", "20261", "20262"));
        periods.put(DatasetKey.STORE_DISTRICT, Set.of("20254", "20261"));

        AnalysisPeriodCatalog catalog = AnalysisPeriodCatalog.of(SPATIAL_VERSION, periods, RESOLVED_AT);

        assertThat(catalog.defaultPeriodCode()).isEqualTo("20261");
        assertThat(catalog.availablePeriodCodes()).containsExactly("20261", "20254");
        assertThat(catalog.firstPeriodCode()).isEqualTo("20254");
        assertThat(catalog.spatialVersion()).isEqualTo(SPATIAL_VERSION);
        assertThat(catalog.resolvedAt()).isEqualTo(RESOLVED_AT);
        assertThat(catalog.newestCorePeriodCode()).isEqualTo("20262");
        assertThat(catalog.laggingDatasets()).containsExactly(DatasetKey.STORE_DISTRICT);
    }

    @Test
    @DisplayName("원천이 끊긴 상권 소비는 교집합에서 빠져 기본 분기를 20234 에 묶지 않는다")
    void discontinuedDatasetDoesNotHoldTheDefaultBack() {
        Map<DatasetKey, Set<String>> periods = allCore(Set.of("20234", "20241", "20261"));
        periods.put(DatasetKey.CONSUMPTION_COMMERCIAL, Set.of("20233", "20234"));

        AnalysisPeriodCatalog catalog = AnalysisPeriodCatalog.of(SPATIAL_VERSION, periods, RESOLVED_AT);

        assertThat(catalog.defaultPeriodCode()).isEqualTo("20261");
        DatasetPeriodCoverage consumption = coverage(catalog, DatasetKey.CONSUMPTION_COMMERCIAL);
        assertThat(consumption.coreForDefault()).isFalse();
        assertThat(consumption.lastPublishablePeriodCode()).isEqualTo("20234");
        assertThat(consumption.latestPeriodCode()).isEqualTo("20234");
        assertThat(consumption.firstPeriodCode()).isEqualTo("20233");
        assertThat(consumption.periodCount()).isEqualTo(2);
        assertThat(catalog.laggingDatasets()).doesNotContain(DatasetKey.CONSUMPTION_COMMERCIAL);
    }

    @Test
    @DisplayName("핵심 데이터셋 하나가 비면 교집합이 비어 기본 분기는 null 이다")
    void emptyCoreDatasetLeavesNoDefault() {
        Map<DatasetKey, Set<String>> periods = allCore(Set.of("20261"));
        periods.put(DatasetKey.CHANGE_DISTRICT, Set.of());

        AnalysisPeriodCatalog catalog = AnalysisPeriodCatalog.of(SPATIAL_VERSION, periods, RESOLVED_AT);

        assertThat(catalog.defaultPeriodCode()).isNull();
        assertThat(catalog.firstPeriodCode()).isNull();
        assertThat(catalog.availablePeriodCodes()).isEmpty();
        assertThat(catalog.laggingDatasets()).containsExactly(DatasetKey.CHANGE_DISTRICT);
        DatasetPeriodCoverage empty = coverage(catalog, DatasetKey.CHANGE_DISTRICT);
        assertThat(empty.latestPeriodCode()).isNull();
        assertThat(empty.firstPeriodCode()).isNull();
        assertThat(empty.periodCount()).isZero();
    }

    @Test
    @DisplayName("맵에 없는 데이터셋은 행이 없는 것으로 보고 닫힌다")
    void missingDatasetIsTreatedAsEmpty() {
        Map<DatasetKey, Set<String>> periods = allCore(Set.of("20261"));
        periods.remove(DatasetKey.SALES_COMMERCIAL);

        AnalysisPeriodCatalog catalog = AnalysisPeriodCatalog.of(SPATIAL_VERSION, periods, RESOLVED_AT);

        assertThat(catalog.defaultPeriodCode()).isNull();
    }

    @Test
    @DisplayName("데이터셋 항목은 DatasetKey 15종을 선언 순서대로 모두 담는다")
    void datasetsCoverEveryDatasetKeyInDeclarationOrder() {
        AnalysisPeriodCatalog catalog = AnalysisPeriodCatalog.of(SPATIAL_VERSION, allCore(Set.of("20261")), RESOLVED_AT);

        assertThat(catalog.datasets()).extracting(DatasetPeriodCoverage::dataset).containsExactly(DatasetKey.values());
        assertThat(catalog.datasets()).filteredOn(DatasetPeriodCoverage::coreForDefault).hasSize(DatasetKey.values().length - 1);
    }

    private static Map<DatasetKey, Set<String>> allCore(Set<String> periodCodes) {
        Map<DatasetKey, Set<String>> periods = new EnumMap<>(DatasetKey.class);
        for (DatasetKey dataset : DatasetKey.values()) {
            periods.put(dataset, periodCodes);
        }
        return periods;
    }

    private static DatasetPeriodCoverage coverage(AnalysisPeriodCatalog catalog, DatasetKey dataset) {
        List<DatasetPeriodCoverage> matches = catalog.datasets().stream().filter(item -> item.dataset() == dataset).toList();
        assertThat(matches).hasSize(1);
        return matches.getFirst();
    }
}
