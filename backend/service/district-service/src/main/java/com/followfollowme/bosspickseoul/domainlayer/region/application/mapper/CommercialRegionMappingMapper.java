package com.followfollowme.bosspickseoul.domainlayer.region.application.mapper;

import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.entity.CommercialRegionMappingEntity;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.projection.AdministrationNameProjection;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.projection.CommercialAdministrationProjection;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.projection.CommercialNameProjection;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.projection.DistrictNameProjection;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.query.DistrictAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.query.RegionCodeLookupQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.region.domain.model.CommercialRegionMapping;
import java.util.List;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

// 인터페이스 기본값은 ERROR 다. 엔티티 -> 도메인은 두 타입의 필드가 1:1 로 맞아야 하고, 앞으로
// CommercialRegionMapping 에 필드가 추가되면 조용히 null/0 으로 남는 대신 컴파일이 막혀야 한다.
// IGNORE 는 투영(projection) 매핑에만 메서드 단위로 건다 — 투영은 대상 레코드의 일부 컬럼만 SELECT 하므로
// 나머지 필드는 "채우지 못한" 것이 아니라 원천에 애초에 없다.
@Mapper(
    componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.ERROR
)
public interface CommercialRegionMappingMapper {

    // 엔티티 -> 도메인
    CommercialRegionMapping toDomainFromEntity(CommercialRegionMappingEntity entity);

    // 엔티티 리스트 -> 도메인 리스트
    List<CommercialRegionMapping> toDomainListFromEntityList(List<CommercialRegionMappingEntity> entities);

    // 투영 -> 도메인 (상권 코드 단건 조회는 좌표/분류 컬럼을 읽지 않으므로 해당 필드는 비어 있다)
    @BeanMapping(unmappedTargetPolicy = ReportingPolicy.IGNORE)
    CommercialRegionMapping toDomainFromProjection(CommercialAdministrationProjection projection);

    // 투영 -> 조회 결과
    @BeanMapping(unmappedTargetPolicy = ReportingPolicy.IGNORE)
    RegionCodeLookupQueryResult toQueryResultFromProjection(DistrictNameProjection projection);

    @BeanMapping(unmappedTargetPolicy = ReportingPolicy.IGNORE)
    RegionCodeLookupQueryResult toQueryResultFromProjection(AdministrationNameProjection projection);

    @BeanMapping(unmappedTargetPolicy = ReportingPolicy.IGNORE)
    RegionCodeLookupQueryResult toQueryResultFromProjection(CommercialNameProjection projection);

    @BeanMapping(unmappedTargetPolicy = ReportingPolicy.IGNORE)
    DistrictAreaQueryResult toDistrictAreaQueryResultFromProjection(DistrictNameProjection projection);
}
