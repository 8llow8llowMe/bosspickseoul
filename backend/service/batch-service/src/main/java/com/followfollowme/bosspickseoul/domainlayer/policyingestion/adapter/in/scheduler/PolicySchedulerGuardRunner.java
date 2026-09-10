package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.BatchTargetGuard;
import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "batch.policy", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
public class PolicySchedulerGuardRunner implements ApplicationRunner {

    private final PolicyIngestionProperties properties;
    private final Environment environment;

    @Override
    public void run(ApplicationArguments args) {
        String commercialUrl = properties.datasource().url();
        String batchUrl = environment.getProperty("BATCH_DB_URL");
        if (commercialUrl.equals(batchUrl)) {
            throw new IllegalArgumentException("Policy ingest must use COMMERCIAL_DB_URL, not BATCH_DB_URL");
        }
        BatchTargetGuard.verify(
            commercialUrl,
            commercialUrl,
            environment.getProperty("BATCH_ALLOWED_SCHEMAS")
        );
    }
}
