package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.persistence.entity.AreaBoundaryEntity;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.enums.AreaType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AreaBoundaryRepository extends JpaRepository<AreaBoundaryEntity, Long> {

    @Query("""
        select a
        from AreaBoundaryEntity a
        where a.areaType = :areaType
          and a.bboxMaxLng >= :minLng
          and a.bboxMinLng <= :maxLng
          and a.bboxMaxLat >= :minLat
          and a.bboxMinLat <= :maxLat
        """)
    List<AreaBoundaryEntity> findAllByAreaTypeAndBoundingBox(AreaType areaType, double minLng, double minLat, double maxLng, double maxLat);
}
