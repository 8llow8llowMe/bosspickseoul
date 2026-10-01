package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.SortedSet;
import java.util.TreeSet;

/**
 * 검증을 마친 한 파일분의 자치구 평균소득. 교체 단위는 이 안에 들어 있는 기준일 전체다.
 *
 * @param sourceChecksum 원본 바이트 SHA-256. 행마다 남겨 어느 파일에서 왔는지 추적한다
 */
public record PensionIncomeSnapshot(String runId, String sourceChecksum, Instant sourceUpdatedAt, List<PensionIncomeDistrictRow> rows) {

    public PensionIncomeSnapshot {
        rows = List.copyOf(rows);
        if (rows.isEmpty()) throw new IllegalArgumentException("Pension income snapshot has no rows");
    }

    /** 교체할 기준일. 행에서 끌어내므로 지우는 범위와 넣는 범위가 어긋날 수 없다. */
    public SortedSet<LocalDate> referenceDates() {
        SortedSet<LocalDate> dates = new TreeSet<>();
        rows.forEach(row -> dates.add(row.referenceDate()));
        return Collections.unmodifiableSortedSet(dates);
    }
}
