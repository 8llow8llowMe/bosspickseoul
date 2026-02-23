package com.followfollowme.nowdoboss.domainlayer.district.application.common;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class PeriodCodeCalculator {

    private static final Pattern PERIOD_PATTERN = Pattern.compile("^\\d{4}[1-4]$");

    public String resolvePreviousPeriodCode(String currentPeriodCode, String previousPeriodCode) {
        validate(currentPeriodCode);

        if (previousPeriodCode == null || previousPeriodCode.isBlank()) {
            return getPreviousPeriodCode(currentPeriodCode);
        }

        validate(previousPeriodCode);
        return previousPeriodCode;
    }

    public List<String> getRecentPeriodCodes(String currentPeriodCode, int size) {
        validate(currentPeriodCode);

        List<String> periodCodes = new ArrayList<>();
        String periodCode = currentPeriodCode;

        for (int i = 0; i < size; i++) {
            periodCodes.add(0, periodCode);
            periodCode = getPreviousPeriodCode(periodCode);
        }

        return periodCodes;
    }

    private String getPreviousPeriodCode(String periodCode) {
        int year = Integer.parseInt(periodCode.substring(0, 4));
        int quarter = Integer.parseInt(periodCode.substring(4));

        if (quarter == 1) {
            return String.format("%04d4", year - 1);
        }

        return String.format("%04d%d", year, quarter - 1);
    }

    private void validate(String periodCode) {
        if (!PERIOD_PATTERN.matcher(periodCode).matches()) {
            throw new IllegalArgumentException("Invalid period code format. Expected YYYYQ.");
        }
    }
}
