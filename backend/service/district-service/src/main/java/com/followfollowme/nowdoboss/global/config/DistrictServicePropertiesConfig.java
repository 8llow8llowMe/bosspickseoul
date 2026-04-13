package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.common.config.JasyptPropertiesConfig;
import com.followfollowme.nowdoboss.common.config.SwaggerPropertiesConfig;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptPropertiesConfig.class,
    SwaggerPropertiesConfig.class
})
public class DistrictServicePropertiesConfig {

}
