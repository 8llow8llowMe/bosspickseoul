package com.followfollowme.nowdoboss.domainlayer.areaboundary.adapter.in.batch.tasklet;

import com.followfollowme.nowdoboss.domainlayer.areaboundary.application.port.in.AreaBoundaryImportUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.StepContribution;
import org.springframework.batch.core.scope.context.ChunkContext;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AreaBoundaryImportTasklet implements Tasklet {

    private final AreaBoundaryImportUseCase areaBoundaryImportUseCase;

    @Override
    public RepeatStatus execute(StepContribution contribution, ChunkContext chunkContext) {
        areaBoundaryImportUseCase.importAreaBoundary();
        return RepeatStatus.FINISHED;
    }
}