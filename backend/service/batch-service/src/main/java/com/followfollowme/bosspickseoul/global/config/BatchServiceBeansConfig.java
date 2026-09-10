package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.common.config.JasyptConfigurer;
import com.followfollowme.bosspickseoul.persistence.config.SnowflakeConfigurer;
import com.followfollowme.bosspickseoul.persistence.config.SnowflakePropertiesConfig;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptConfigurer.class,
    SnowflakeConfigurer.class,
    SnowflakePropertiesConfig.class
})
public class BatchServiceBeansConfig {

}
