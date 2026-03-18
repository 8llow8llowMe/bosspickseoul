package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.custom.CommunityPostCustomRepository;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityPostRepository extends JpaRepository<CommunityPostEntity, Long>, CommunityPostCustomRepository {

}
