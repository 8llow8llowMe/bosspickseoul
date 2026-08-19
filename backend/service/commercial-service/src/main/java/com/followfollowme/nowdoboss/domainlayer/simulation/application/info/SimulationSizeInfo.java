package com.followfollowme.nowdoboss.domainlayer.simulation.application.info;

import lombok.Builder;

@Builder
public record SimulationSizeInfo(
    int squareMeter,
    int pyeong
) {

    private static final double PYEONG_PER_SQUARE_METER = 0.3025D;

    public static SimulationSizeInfo fromSquareMeter(int squareMeter) {
        return SimulationSizeInfo.builder()
            .squareMeter(squareMeter)
            .pyeong((int) (squareMeter * PYEONG_PER_SQUARE_METER))
            .build();
    }
}
