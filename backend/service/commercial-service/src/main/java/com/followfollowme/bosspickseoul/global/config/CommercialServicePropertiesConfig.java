package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.common.config.JasyptPropertiesConfig;
import com.followfollowme.bosspickseoul.common.config.SwaggerPropertiesConfig;
import com.followfollowme.bosspickseoul.global.properties.CleanupProperties;
import com.followfollowme.bosspickseoul.global.properties.RankingProperties;
import com.followfollowme.bosspickseoul.global.properties.ShareLinkProperties;
import com.followfollowme.bosspickseoul.global.properties.SimulationProperties;
import com.followfollowme.bosspickseoul.persistence.config.SnowflakePropertiesConfig;
import com.followfollowme.bosspickseoul.redis.config.RedisPropertiesConfig;
import com.followfollowme.bosspickseoul.security.resourceserver.config.JwtResourceServerPropertiesConfig;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptPropertiesConfig.class,
    SwaggerPropertiesConfig.class,
    SnowflakePropertiesConfig.class,
    JwtResourceServerPropertiesConfig.class,
    RedisPropertiesConfig.class
})
@EnableConfigurationProperties({
    ShareLinkProperties.class, RankingProperties.class, CleanupProperties.class, SimulationProperties.class
})
public class CommercialServicePropertiesConfig {

}
