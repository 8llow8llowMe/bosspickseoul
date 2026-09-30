package com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

public record Quarter(String value) implements Comparable<Quarter> {
    public Quarter {
        if (value == null || !value.matches("20[0-9]{2}[1-4]")) {
            throw new IllegalArgumentException("period must be YYYYQ (2000-2099, quarter 1-4)");
        }
    }

    public int year() { return Integer.parseInt(value.substring(0, 4)); }

    public int quarter() { return value.charAt(4) - '0'; }

    public Quarter next() {
        return quarter() == 4 ? of(year() + 1, 1) : of(year(), quarter() + 1);
    }

    public Quarter previous() {
        return quarter() == 1 ? of(year() - 1, 4) : of(year(), quarter() - 1);
    }

    /**
     * 분기 말일 00:00 UTC. 원천이 개정 시각을 주지 않으므로 {@code source_updated_at} 에 이 값을 쓴다.
     * {@code scripts/batch/quarterly-import-plan.ps1} 의 {@code Get-SourceUpdatedAt} 와 같은 규칙이라
     * 수동 run 과 자동 run 이 같은 슬롯에서 "더 새로운 원천" 판정을 두고 다투지 않는다.
     */
    public Instant endInstant() {
        LocalDate firstOfNext = LocalDate.of(year(), quarter() * 3, 1).plusMonths(1);
        return firstOfNext.minusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
    }

    private static Quarter of(int year, int quarter) {
        return new Quarter("%04d%d".formatted(year, quarter));
    }

    @Override
    public int compareTo(Quarter other) { return value.compareTo(other.value); }
}
