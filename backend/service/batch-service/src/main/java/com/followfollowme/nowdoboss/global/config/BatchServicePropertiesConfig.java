package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.common.config.JasyptPropertiesConfig;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptPropertiesConfig.class
})
public class BatchServicePropertiesConfig {

}
