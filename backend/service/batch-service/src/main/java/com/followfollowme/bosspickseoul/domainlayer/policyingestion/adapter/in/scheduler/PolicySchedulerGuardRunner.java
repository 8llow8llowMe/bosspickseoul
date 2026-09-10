package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.BatchTargetGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@Profile("scheduler")
@RequiredArgsConstructor
public class PolicySchedulerGuardRunner implements ApplicationRunner {

    private final Environment environment;

    @Override
    public void run(ApplicationArguments args) {
        BatchTargetGuard.verify(
            environment.getProperty("BATCH_DB_URL"),
            environment.getProperty("spring.datasource.url"),
            environment.getProperty("BATCH_ALLOWED_SCHEMAS")
        );
    }
}
