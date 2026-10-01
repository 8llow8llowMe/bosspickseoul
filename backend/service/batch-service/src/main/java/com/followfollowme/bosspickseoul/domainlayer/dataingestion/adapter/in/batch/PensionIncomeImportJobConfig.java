package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeImportResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.PensionIncomeImportProcessor;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * 국민연금 자치구 평균소득 적재 Job(이슈 #415). 파일 한 개 = 실행 한 번이고, 검증·교체가 tasklet 하나에서 끝난다.
 * 1,150행 규모라 chunk 로 나누지 않는다. 스텝 트랜잭션은 테이블이 있는 commercial 스키마 쪽이다.
 */
@Configuration
public class PensionIncomeImportJobConfig {

    @Bean
    public Job pensionIncomeImportJob(JobRepository repository, @Qualifier("commercialTransactionManager") PlatformTransactionManager transactionManager,
                                      PensionIncomeImportProcessor processor) {
        var step = new StepBuilder("pensionIncomeImport", repository).tasklet((contribution, context) -> {
            PensionIncomeImportRequest request = PensionIncomeJobParameters.read(contribution.getStepExecution().getJobParameters());
            PensionIncomeImportResult result = processor.importFile(request);
            var execution = contribution.getStepExecution().getExecutionContext();
            execution.putString("sourceChecksum", result.receipt().checksum());
            execution.putString("rawLocation", result.receipt().rawLocation());
            execution.putLong("sourceInputRows", result.receipt().inputRows());
            execution.putString("referenceDates", result.referenceDates().toString());
            execution.putInt("seoulRows", result.seoulRows());
            execution.putInt("ignoredNonSeoulRows", result.ignoredNonSeoulRows());
            execution.putString("published", Boolean.toString(result.published()));
            return RepeatStatus.FINISHED;
        }, transactionManager).build();
        return new JobBuilder("pensionIncomeImportJob", repository).start(step).build();
    }
}
