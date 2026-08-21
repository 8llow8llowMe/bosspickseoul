package com.followfollowme.bosspickseoul.security.common.resolver;

import com.followfollowme.bosspickseoul.security.common.exception.SecurityErrorCode;

public interface JwtTokenErrorResolver {

    SecurityErrorCode resolve(Throwable ex);
}

