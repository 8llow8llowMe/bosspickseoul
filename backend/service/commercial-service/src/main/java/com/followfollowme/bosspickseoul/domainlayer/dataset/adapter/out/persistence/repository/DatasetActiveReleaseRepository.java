package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetActiveReleaseEntity;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetActiveReleaseId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DatasetActiveReleaseRepository extends JpaRepository<DatasetActiveReleaseEntity, DatasetActiveReleaseId> {
}
