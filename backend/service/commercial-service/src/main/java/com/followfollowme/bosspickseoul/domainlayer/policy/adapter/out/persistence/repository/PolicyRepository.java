package com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.entity.PolicyEntity;
import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.repository.custom.PolicyCustomRepository;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PolicyRepository extends JpaRepository<PolicyEntity, Long>, PolicyCustomRepository {

}
