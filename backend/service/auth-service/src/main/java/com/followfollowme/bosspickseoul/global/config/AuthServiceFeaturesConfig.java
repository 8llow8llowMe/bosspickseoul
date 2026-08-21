package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.persistence.config.JpaAuditConfig;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JpaAuditConfig.class
})
public class AuthServiceFeaturesConfig {

}
