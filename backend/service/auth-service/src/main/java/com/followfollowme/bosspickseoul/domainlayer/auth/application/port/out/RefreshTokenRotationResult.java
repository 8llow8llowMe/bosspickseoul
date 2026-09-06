package com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out;

public enum RefreshTokenRotationResult {
    ROTATED,
    MISSING,
    TOKEN_MISMATCH
}
