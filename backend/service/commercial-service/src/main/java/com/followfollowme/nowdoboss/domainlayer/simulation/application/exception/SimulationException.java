package com.followfollowme.nowdoboss.domainlayer.simulation.application.exception;

import lombok.Getter;

@Getter
public class SimulationException extends RuntimeException {

    private final SimulationErrorCode errorCode;

    public SimulationException(SimulationErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
