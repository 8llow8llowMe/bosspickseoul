package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJob;
import java.util.Optional;

public interface AiReportJobStorePort {

    Optional<AiReportJob> findById(String jobId);

    /**
     * Atomically reserves the idempotency slot for {@code (memberId, requestHash)}.
     * Returns {@link Optional#empty()} when the caller successfully reserves the slot
     * (must proceed with {@link #save(AiReportJob)}).
     * Returns {@link Optional#of(Object)} containing the previously reserved jobId
     * when another concurrent caller already won the slot.
     */
    Optional<String> reserveOrGetExistingJobId(Long memberId, String requestHash, String newJobId);

    void releaseIdempotencyKey(Long memberId, String requestHash);

    AiReportJob save(AiReportJob job);

    void deleteJob(String jobId);
}
