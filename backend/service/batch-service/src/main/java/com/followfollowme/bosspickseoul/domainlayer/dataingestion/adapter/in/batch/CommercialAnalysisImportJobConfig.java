package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.*;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.*;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetRowProcessor;
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
    private static final String[] RECEIPT_KEYS = {"sourceChecksum", "rawLocation", "sourceInputRows"};

    @Bean
    public Job commercialAnalysisImportJob(JobRepository repository, PlatformTransactionManager transactionManager,
                                          DatasetReleasePort releases, DatasetItemReader datasetItemReader,
                                          DatasetStagingStep datasetStagingStep) {
        Step prepare = new StepBuilder("datasetPrepare", repository).allowStartIfComplete(true)
            .tasklet((contribution, context) -> {
                releases.begin(ImportJobParameters.read(contribution.getStepExecution().getJobParameters()));
                contribution.getStepExecution().getJobExecution().getExecutionContext().put("releaseBegan", true);
                return RepeatStatus.FINISHED;
            }, transactionManager).build();
        ExecutionContextPromotionListener receiptPromotion = new ExecutionContextPromotionListener();
        receiptPromotion.setKeys(RECEIPT_KEYS);
        Step load = new StepBuilder("datasetStage", repository).allowStartIfComplete(true)
            .<SourceRow, RowValidation>chunk(1000, transactionManager)
            .reader(datasetItemReader).processor(datasetStagingStep).writer(datasetStagingStep)
            .listener(receiptPromotion).build();
        Step validate = new StepBuilder("datasetValidate", repository).allowStartIfComplete(true).tasklet((contribution, context) -> {
            ImportRequest request = ImportJobParameters.read(contribution.getStepExecution().getJobParameters());
            ExecutionContext execution = contribution.getStepExecution().getJobExecution().getExecutionContext();
            ValidationResult validation = releases.validate(request, receipt(execution));
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
            SourceReceipt receipt = receipt(execution);
            ValidationResult validation = new ValidationResult(execution.getLong("acceptedRows"), execution.getLong("rejectedRows"),
                execution.getLong("duplicateKeys"), execution.getLong("unmappedRows"));
            if (!validation.valid(request.expectedRows()) || receipt.inputRows() != request.expectedRows()) {
                // The counts are the operator's next --expected-rows and rejection lead; do not make them dig for them.
                throw new IllegalStateException("Dataset validation failed: expected=" + request.expectedRows()
                    + " input=" + receipt.inputRows() + " accepted=" + validation.acceptedRows()
                    + " rejected=" + validation.rejectedRows() + " duplicate=" + validation.duplicateKeys()
                    + " unmapped=" + validation.unmappedRows() + "; inspect dataset_release and dataset_rejected_row");
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

    private static SourceReceipt receipt(ExecutionContext execution) {
        return new SourceReceipt(execution.getString("sourceChecksum"), execution.getString("rawLocation"),
            execution.getLong("sourceInputRows"));
    }

    @Bean
    @StepScope
    public DatasetItemReader datasetItemReader(DatasetSourcePort source, @Value("#{stepExecution}") StepExecution stepExecution) {
        return new DatasetItemReader(source, ImportJobParameters.read(stepExecution.getJobParameters()), stepExecution);
    }

    @Bean
    @StepScope
    public DatasetStagingStep datasetStagingStep(DatasetRowProcessor rows, DatasetReleasePort releases,
                                                 @Value("#{stepExecution}") StepExecution stepExecution) {
        return new DatasetStagingStep(rows, releases, ImportJobParameters.read(stepExecution.getJobParameters()));
    }
}
