package com.followfollowme.nowdoboss.domainlayer.commercial.application.model;

public record MetricRange(double min, double max) {

    public static final MetricRange EMPTY = new MetricRange(0D, 0D);

    public boolean isCollapsed() {
        return Double.compare(min, max) == 0;
    }
}
