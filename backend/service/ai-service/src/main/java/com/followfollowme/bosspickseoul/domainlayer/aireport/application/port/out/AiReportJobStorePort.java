package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobStatus;
import java.util.Optional;

public interface AiReportJobStorePort {

    Optional<AiReportJob> findById(String jobId);

    /**
     * Atomically reserves the idempotency slot for {@code (memberId, requestHash)}.
     * Returns the jobId that owns the slot after the atomic operation. The returned value is
     * {@code newJobId} when this caller won, or the existing owner's jobId when it lost.
     */
    String reserveOrGetExistingJobId(Long memberId, String requestHash, String newJobId);

    /** Releases the slot only if it still belongs to {@code expectedJobId}. */
    void releaseIdempotencyKey(Long memberId, String requestHash, String expectedJobId);

    AiReportJob save(AiReportJob job);

    /**
     * Atomically replaces an existing job only while it has {@code expectedStatus}.
     * Returns false for a missing job or a lost transition race; storage failures must throw.
     */
    boolean saveIfStatus(AiReportJob job, AiReportJobStatus expectedStatus);

    void deleteJob(String jobId);
}
