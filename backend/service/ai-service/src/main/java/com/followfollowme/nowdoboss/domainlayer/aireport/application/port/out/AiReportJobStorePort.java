package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJob;
import java.util.Optional;

public interface AiReportJobStorePort {

    Optional<AiReportJob> findById(String jobId);

    /**
     * Atomically reserves the idempotency slot for {@code (userId, requestHash)}.
     * Returns {@link Optional#empty()} when the caller successfully reserves the slot
     * (must proceed with {@link #save(AiReportJob)}).
     * Returns {@link Optional#of(Object)} containing the previously reserved jobId
     * when another concurrent caller already won the slot.
     */
    Optional<String> reserveOrGetExistingJobId(Long userId, String requestHash, String newJobId);

    void releaseIdempotencyKey(Long userId, String requestHash);

    AiReportJob save(AiReportJob job);

    void deleteJob(String jobId);
}
