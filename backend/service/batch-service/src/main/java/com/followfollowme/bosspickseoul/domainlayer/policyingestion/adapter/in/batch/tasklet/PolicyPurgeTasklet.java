package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.batch.tasklet;

import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.port.in.PolicyPurgeUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.StepContribution;
import org.springframework.batch.core.scope.context.ChunkContext;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PolicyPurgeTasklet implements Tasklet {

    private final PolicyPurgeUseCase policyPurgeUseCase;

    @Override
    public RepeatStatus execute(StepContribution contribution, ChunkContext chunkContext) {
        policyPurgeUseCase.purgeExpired();
        return RepeatStatus.FINISHED;
    }
}
