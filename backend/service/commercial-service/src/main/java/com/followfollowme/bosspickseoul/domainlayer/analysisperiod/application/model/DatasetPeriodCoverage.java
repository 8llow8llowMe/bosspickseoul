package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.model;

import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.util.SortedSet;

/**
 * 데이터셋 하나의 적재 분기 범위.
 *
 * @param latestPeriodCode          가장 최근 적재 분기. 행이 없으면 null
 * @param firstPeriodCode           가장 오래된 적재 분기. 행이 없으면 null
 * @param periodCount               적재된 분기 수
 * @param coreForDefault            기본 분기 교집합에 들어가는지. 원천 중단 상한이 있는 데이터셋은 빠진다
 * @param lastPublishablePeriodCode 원천 중단 상한({@link DatasetKey#lastPublishablePeriodCode()}). 없으면 null
 */
public record DatasetPeriodCoverage(
    DatasetKey dataset, String latestPeriodCode, String firstPeriodCode, int periodCount, boolean coreForDefault,
    String lastPublishablePeriodCode
) {

    public static DatasetPeriodCoverage of(DatasetKey dataset, SortedSet<String> periodCodes) {
        String lastPublishable = dataset.lastPublishablePeriodCode();
        return new DatasetPeriodCoverage(
            dataset,
            periodCodes.isEmpty() ? null : periodCodes.last(),
            periodCodes.isEmpty() ? null : periodCodes.first(),
            periodCodes.size(),
            lastPublishable == null,
            lastPublishable);
    }
}
