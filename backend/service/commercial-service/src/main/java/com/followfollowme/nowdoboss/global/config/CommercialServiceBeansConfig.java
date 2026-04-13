package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.common.config.JasyptConfigurer;
import com.followfollowme.nowdoboss.common.config.SwaggerSecurityConfigurer;
import com.followfollowme.nowdoboss.persistence.config.QuerydslConfigurer;
import com.followfollowme.nowdoboss.persistence.config.SnowflakeConfigurer;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptConfigurer.class,
    SnowflakeConfigurer.class,
    QuerydslConfigurer.class,
    SwaggerSecurityConfigurer.class
})
public class CommercialServiceBeansConfig {

}
