package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactEntity;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactId;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 모든 조회는 run_id 를 먼저 고정한다. PK (run_id, area_code, service_code) 접두 탐색이라 2차 인덱스가 필요 없다.
 * run_id 없이 area_code 나 service_code 만으로 찾는 메서드는 만들지 않는다 (풀스캔).
 */
public interface DatasetFactRepository extends JpaRepository<DatasetFactEntity, DatasetFactId> {

    Optional<DatasetFactEntity> findByIdRunIdAndIdAreaCodeAndIdServiceCode(String runId, String areaCode, String serviceCode);

    List<DatasetFactEntity> findAllByIdRunIdAndIdAreaCodeInAndIdServiceCode(String runId, Collection<String> areaCodes, String serviceCode);

    List<DatasetFactEntity> findAllByIdRunIdInAndIdAreaCodeAndIdServiceCode(Collection<String> runIds, String areaCode, String serviceCode);
}
