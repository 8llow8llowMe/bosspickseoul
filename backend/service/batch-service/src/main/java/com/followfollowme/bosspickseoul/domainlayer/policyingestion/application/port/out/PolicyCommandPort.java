package com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model.PolicyUpsert;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.domain.enums.PolicySource;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface PolicyCommandPort {

    long countBySource(PolicySource source);

    void upsertAll(PolicySource source, List<PolicyUpsert> rows, LocalDateTime seenAt);

    int staleMarkUnseen(PolicySource source, LocalDateTime seenAt, LocalDate hideEndAt);

    int deleteUnseenBefore(PolicySource source, LocalDateTime cutoff);
}
