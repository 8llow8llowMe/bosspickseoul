package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.common.config.JasyptConfigurer;
import com.followfollowme.bosspickseoul.common.config.SwaggerSecurityConfigurer;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptConfigurer.class,
    SwaggerSecurityConfigurer.class
})
public class DistrictServiceBeansConfig {

}
