package com.followfollowme.nowdoboss.storage.config;

import com.followfollowme.nowdoboss.storage.properties.StorageProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(StorageProperties.class)
public class StoragePropertiesConfig {

}
