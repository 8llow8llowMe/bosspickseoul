package com.followfollowme.nowdoboss.redis.properties;

import com.followfollowme.nowdoboss.redis.properties.enums.RedisMode;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "infra.redis")
public record RedisProperties(
    RedisMode mode,
    String host,
    Integer port,
    String masterName,
    String password,
    List<SentinelNode> sentinels
) {

    public record SentinelNode(
        String host,
        int port
    ) {

    }
}
