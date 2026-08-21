package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.common.config.JasyptConfigurer;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JasyptConfigurer.class
})
public class BatchServiceBeansConfig {

}
