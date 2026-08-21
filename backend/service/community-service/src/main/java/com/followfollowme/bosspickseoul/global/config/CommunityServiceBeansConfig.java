package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.common.config.JasyptConfigurer;
import com.followfollowme.bosspickseoul.common.config.SwaggerSecurityConfigurer;
import com.followfollowme.bosspickseoul.persistence.config.QuerydslConfigurer;
import com.followfollowme.bosspickseoul.persistence.config.SnowflakeConfigurer;
import com.followfollowme.bosspickseoul.security.resourceserver.config.ResourceServerSecurityConfigurer;
import com.followfollowme.bosspickseoul.storage.config.StorageConfigurer;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptConfigurer.class,
    SnowflakeConfigurer.class,
    QuerydslConfigurer.class,
    ResourceServerSecurityConfigurer.class,
    StorageConfigurer.class,
    SwaggerSecurityConfigurer.class
})
public class CommunityServiceBeansConfig {

}
