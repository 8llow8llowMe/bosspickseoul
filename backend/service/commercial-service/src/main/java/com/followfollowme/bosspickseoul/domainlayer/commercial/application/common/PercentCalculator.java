package com.followfollowme.bosspickseoul.domainlayer.commercial.application.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class PercentCalculator {

    private static final int CALC_SCALE = 8;
    private static final int RESULT_SCALE = 2;

    private PercentCalculator() {
    }

    public static double estimatedJointPercent(long a, long b, long total) {
        if (total <= 0 || a <= 0 || b <= 0) {
            return 0.0;
        }

        BigDecimal totalBd = BigDecimal.valueOf(total);

        BigDecimal aRatio = BigDecimal.valueOf(a)
            .divide(totalBd, CALC_SCALE, RoundingMode.HALF_UP);

        BigDecimal bRatio = BigDecimal.valueOf(b)
            .divide(totalBd, CALC_SCALE, RoundingMode.HALF_UP);

        BigDecimal percent = aRatio
            .multiply(bRatio)
            .multiply(BigDecimal.valueOf(100));

        return percent
            .setScale(RESULT_SCALE, RoundingMode.HALF_UP)
            .doubleValue();
    }

    public static double ratio(long part, long total) {
        if (total <= 0 || part <= 0) {
            return 0.0;
        }

        return BigDecimal.valueOf(part)
            .divide(BigDecimal.valueOf(total), CALC_SCALE, RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100))
            .setScale(RESULT_SCALE, RoundingMode.HALF_UP)
            .doubleValue();
    }
}
