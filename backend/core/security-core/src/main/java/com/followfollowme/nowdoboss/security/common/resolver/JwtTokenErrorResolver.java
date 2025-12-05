package com.followfollowme.nowdoboss.security.common.resolver;

import com.followfollowme.nowdoboss.security.common.exception.SecurityErrorCode;

public interface JwtTokenErrorResolver {

    SecurityErrorCode resolve(Throwable ex);
}

