package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.*;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.*;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetRowProcessor;
import java.util.ArrayList;
import org.springframework.batch.core.*;
import org.springframework.batch.core.configuration.annotation.StepScope;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.listener.ExecutionContextPromotionListener;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ExecutionContext;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
@Profile("quarterly")
public class CommercialAnalysisImportJobConfig {
    @Bean
    public Job commercialAnalysisImportJob(JobRepository repository, PlatformTransactionManager transactionManager,
                                          DatasetSourcePort source, DatasetReleasePort releases, DatasetItemReader datasetItemReader) {
        Step prepare = new StepBuilder("datasetPrepare", repository).allowStartIfComplete(true)
            .tasklet((contribution, context) -> {
                releases.begin(ImportJobParameters.read(contribution.getStepExecution().getJobParameters()));
                contribution.getStepExecution().getJobExecution().getExecutionContext().put("releaseBegan", true);
                return RepeatStatus.FINISHED;
            }, transactionManager).build();
        ExecutionContextPromotionListener receiptPromotion = new ExecutionContextPromotionListener();
        receiptPromotion.setKeys(new String[] {"sourceChecksum", "rawLocation", "sourceInputRows"});
        DatasetRowProcessor processor = new DatasetRowProcessor();
        Step load = new StepBuilder("datasetStage", repository).allowStartIfComplete(true)
            .<SourceRow, RowValidation>chunk(1000, transactionManager).reader(datasetItemReader)
            .processor(row -> processor.process(ImportJobParameters.read(datasetItemReaderRequest()), row))
            .writer(chunk -> {
                ImportRequest request = ImportJobParameters.read(datasetItemReaderRequest());
                var accepted = new ArrayList<FactRow>();
                for (RowValidation result : chunk) {
                    if (result.accepted()) accepted.add(result.fact());
                    else releases.reject(request, result.source(), result.rejectionReason());
                }
                if (!accepted.isEmpty()) releases.stage(request, accepted);
            }).listener(receiptPromotion).build();
        Step validate = new StepBuilder("datasetValidate", repository).allowStartIfComplete(true).tasklet((contribution, context) -> {
            ImportRequest request = ImportJobParameters.read(contribution.getStepExecution().getJobParameters());
            ExecutionContext execution = contribution.getStepExecution().getJobExecution().getExecutionContext();
            SourceReceipt receipt = new SourceReceipt(execution.getString("sourceChecksum"), execution.getString("rawLocation"), execution.getLong("sourceInputRows"));
            ValidationResult validation = releases.validate(request, receipt);
            execution.putLong("acceptedRows", validation.acceptedRows());
            execution.putLong("rejectedRows", validation.rejectedRows());
            execution.putLong("duplicateKeys", validation.duplicateKeys());
            execution.putLong("unmappedRows", validation.unmappedRows());
            return RepeatStatus.FINISHED;
        }, transactionManager).build();
        // Separate step so validation audit commits even when publication is refused.
        Step publish = new StepBuilder("datasetPublish", repository).tasklet((contribution, context) -> {
            ImportRequest request = ImportJobParameters.read(contribution.getStepExecution().getJobParameters());
            ExecutionContext execution = contribution.getStepExecution().getJobExecution().getExecutionContext();
            SourceReceipt receipt = new SourceReceipt(execution.getString("sourceChecksum"), execution.getString("rawLocation"), execution.getLong("sourceInputRows"));
            ValidationResult validation = new ValidationResult(execution.getLong("acceptedRows"), execution.getLong("rejectedRows"),
                execution.getLong("duplicateKeys"), execution.getLong("unmappedRows"));
            if (!validation.valid(request.expectedRows()) || receipt.inputRows() != request.expectedRows()) {
                throw new IllegalStateException("Dataset validation failed; inspect dataset_release and dataset_rejected_row");
            }
            releases.complete(request, receipt, validation);
            return RepeatStatus.FINISHED;
        }, transactionManager).build();
        return new JobBuilder("commercialAnalysisImportJob", repository)
            .listener(new JobExecutionListener() {
                @Override public void beforeJob(JobExecution execution) {
                    execution.getExecutionContext().put("releaseBegan", false);
                }
                @Override public void afterJob(JobExecution execution) {
                    if (execution.getStatus() == BatchStatus.FAILED && Boolean.TRUE.equals(execution.getExecutionContext().get("releaseBegan"))) {
                        releases.fail(ImportJobParameters.read(execution.getJobParameters()), "JOB_FAILED");
                    }
                }
            }).start(prepare).next(load).next(validate).next(publish).build();
    }

    private JobParameters datasetItemReaderRequest() {
        return org.springframework.batch.core.scope.context.StepSynchronizationManager.getContext().getStepExecution().getJobParameters();
    }

    @Bean
    @StepScope
    public DatasetItemReader datasetItemReader(DatasetSourcePort source, @Value("#{stepExecution}") StepExecution stepExecution) {
        return new DatasetItemReader(source, ImportJobParameters.read(stepExecution.getJobParameters()), stepExecution);
    }
}
