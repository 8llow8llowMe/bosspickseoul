package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.common.config.JasyptPropertiesConfig;
import com.followfollowme.bosspickseoul.common.config.SwaggerPropertiesConfig;
import com.followfollowme.bosspickseoul.global.properties.MapViewportProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptPropertiesConfig.class,
    SwaggerPropertiesConfig.class
})
@EnableConfigurationProperties({
    MapViewportProperties.class
})
public class DistrictServicePropertiesConfig {

}
