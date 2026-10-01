package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.model;

import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

/**
 * 적재된 팩트 데이터 기준 분석 분기 카탈로그(이슈 #464).
 *
 * <p><b>기본 분기</b>는 원천 중단 상한이 없는 데이터셋(핵심 데이터셋) 모두에 행이 있는 분기 중 가장 최근 분기다.
 * 한 데이터셋이라도 비어 있는 분기를 기본으로 잡으면 그 데이터셋을 읽는 화면이 "해당 분기 데이터 없음" 404 가 된다.
 * 원천이 끊긴 데이터셋(상권 소비, 20234 까지)을 넣으면 기본 분기가 그 상한에 묶이므로 교집합에서 뺀다.
 * 화면별 기본 분기는 두지 않는다 — 공유 링크·북마크·커뮤니티 초안·AI 리포트가 한 분기 코드를 여러 화면에 재사용한다.
 *
 * @param defaultPeriodCode    기본 분기. 교집합이 비면 null (분기 생략 요청은 503)
 * @param availablePeriodCodes 교집합 전체, 최신순
 * @param firstPeriodCode      교집합의 가장 오래된 분기. 교집합이 비면 null
 * @param spatialVersion       카탈로그를 계산한 공간 스냅샷
 * @param resolvedAt           카탈로그를 계산한 시각
 * @param datasets             {@link DatasetKey} 선언 순서의 데이터셋별 범위
 */
public record AnalysisPeriodCatalog(
    String defaultPeriodCode, List<String> availablePeriodCodes, String firstPeriodCode, String spatialVersion,
    OffsetDateTime resolvedAt, List<DatasetPeriodCoverage> datasets
) {

    public AnalysisPeriodCatalog {
        availablePeriodCodes = List.copyOf(availablePeriodCodes);
        datasets = List.copyOf(datasets);
    }

    /** 데이터셋별 적재 분기에서 카탈로그를 만든다. 맵에 없는 데이터셋은 행이 없는 것으로 본다(교집합이 비어 503 쪽으로 닫힌다). */
    public static AnalysisPeriodCatalog of(
        String spatialVersion, Map<DatasetKey, ? extends Collection<String>> periodCodesByDataset, OffsetDateTime resolvedAt
    ) {
        List<DatasetPeriodCoverage> datasets = new ArrayList<>();
        TreeSet<String> common = null;
        for (DatasetKey dataset : DatasetKey.values()) {
            Collection<String> loaded = periodCodesByDataset.get(dataset);
            TreeSet<String> periodCodes = loaded == null ? new TreeSet<>() : new TreeSet<>(loaded);
            DatasetPeriodCoverage coverage = DatasetPeriodCoverage.of(dataset, periodCodes);
            datasets.add(coverage);
            if (!coverage.coreForDefault()) {
                continue;
            }
            if (common == null) {
                common = new TreeSet<>(periodCodes);
            } else {
                common.retainAll(periodCodes);
            }
        }

        List<String> available = common == null ? List.of() : List.copyOf(common.descendingSet());
        String defaultPeriodCode = available.isEmpty() ? null : available.getFirst();
        String firstPeriodCode = available.isEmpty() ? null : available.getLast();
        return new AnalysisPeriodCatalog(defaultPeriodCode, available, firstPeriodCode, spatialVersion, resolvedAt, datasets);
    }

    /** 핵심 데이터셋 중 가장 앞선 최신 분기. 핵심 데이터셋이 모두 비면 null. */
    public String newestCorePeriodCode() {
        return datasets.stream()
            .filter(DatasetPeriodCoverage::coreForDefault)
            .map(DatasetPeriodCoverage::latestPeriodCode)
            .filter(periodCode -> periodCode != null)
            .max(String::compareTo)
            .orElse(null);
    }

    /** 기본 분기를 붙잡고 있는 핵심 데이터셋. 최신 분기가 {@link #newestCorePeriodCode()} 보다 뒤처지거나 행이 없다. */
    public List<DatasetKey> laggingDatasets() {
        String newest = newestCorePeriodCode();
        return datasets.stream()
            .filter(DatasetPeriodCoverage::coreForDefault)
            .filter(coverage -> coverage.latestPeriodCode() == null || coverage.latestPeriodCode().compareTo(newest) < 0)
            .map(DatasetPeriodCoverage::dataset)
            .toList();
    }
}
