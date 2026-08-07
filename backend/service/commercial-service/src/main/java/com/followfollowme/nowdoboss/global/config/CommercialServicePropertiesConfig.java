package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.common.config.JasyptPropertiesConfig;
import com.followfollowme.nowdoboss.common.config.SwaggerPropertiesConfig;
import com.followfollowme.nowdoboss.global.properties.RankingProperties;
import com.followfollowme.nowdoboss.global.properties.ShareLinkProperties;
import com.followfollowme.nowdoboss.persistence.config.SnowflakePropertiesConfig;
import com.followfollowme.nowdoboss.redis.config.RedisPropertiesConfig;
import com.followfollowme.nowdoboss.security.resourceserver.config.JwtResourceServerPropertiesConfig;
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
@EnableConfigurationProperties({ShareLinkProperties.class, RankingProperties.class})
public class CommercialServicePropertiesConfig {

}
