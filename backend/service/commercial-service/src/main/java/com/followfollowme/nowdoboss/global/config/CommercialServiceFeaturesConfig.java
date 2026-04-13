package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.persistence.config.JpaAuditConfig;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import({
    JpaAuditConfig.class
})
public class CommercialServiceFeaturesConfig {

}
