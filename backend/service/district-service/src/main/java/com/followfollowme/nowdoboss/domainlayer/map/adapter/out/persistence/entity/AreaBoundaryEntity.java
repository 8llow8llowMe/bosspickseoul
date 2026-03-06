package com.followfollowme.nowdoboss.domainlayer.map.adapter.out.persistence.entity;

import com.followfollowme.nowdoboss.domainlayer.map.domain.enums.AreaType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Entity
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "area_boundary",
    indexes = {
        @Index(name = "idx_area_boundary_type_code", columnList = "areaType, areaCode"),
        @Index(name = "idx_area_boundary_bbox_lng", columnList = "bboxMinLng, bboxMaxLng"),
        @Index(name = "idx_area_boundary_bbox_lat", columnList = "bboxMinLat, bboxMaxLat")
    }
)
public class AreaBoundaryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("영역 PK")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Comment("영역 타입(DISTRICT, ADMINISTRATION, COMMERCIAL)")
    private AreaType areaType;

    @Column(length = 32, nullable = false)
    @Comment("영역 코드")
    private String areaCode;

    @Column(length = 120, nullable = false)
    @Comment("영역 이름")
    private String areaName;

    @Column(nullable = false)
    @Comment("중심점 경도")
    private Double centerLng;

    @Column(nullable = false)
    @Comment("중심점 위도")
    private Double centerLat;

    @Lob
    @Column(columnDefinition = "json", nullable = false)
    @Comment("영역 경계 좌표(JSON)")
    private String boundaryGeoJson;

    @Column(nullable = false)
    @Comment("최소 경도")
    private Double bboxMinLng;

    @Column(nullable = false)
    @Comment("최소 위도")
    private Double bboxMinLat;

    @Column(nullable = false)
    @Comment("최대 경도")
    private Double bboxMaxLng;

    @Column(nullable = false)
    @Comment("최대 위도")
    private Double bboxMaxLat;
}
