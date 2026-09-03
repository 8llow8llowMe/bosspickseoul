package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client.feign.CommunityRegionClient;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityTargetMetaRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.RegionTargetQueryResults.AdministrationAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.RegionTargetQueryResults.CommercialAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.RegionTargetQueryResults.DistrictAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityTargetMeta;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 커뮤니티 대상(자치구/행정동/상권) 검증·명칭 조회를 지역 데이터의 원천인 district-service
 * 실조회로 처리한다.
 *
 * <p>이전에는 로컬 참조 테이블(commercial_region_mapping)을 조회했지만, 원천 테이블은
 * district-service DB 에 있고 서비스별 DB 분리 후 로컬 복제본을 채우는 절차가 없어
 * 모든 대상 검증이 404 로 떨어졌다. 복제본을 시딩하면 이후 지역 데이터 갱신 때마다
 * 불일치가 생기므로, commercial-service 와 동일하게 원천 실조회로 전환했다
 * (지역 메타는 직접 DB 로 소유하지 않는다 — architecture 원칙).
 */
@Component
@RequiredArgsConstructor
public class CommunityTargetMetaClientAdapter implements CommunityTargetMetaRepositoryPort {

    private final CommunityRegionClient communityRegionClient;
    private final InternalResponseSupport responseSupport;

    @Override
    public Optional<CommunityTargetMeta> findTargetMeta(CommunityTargetType targetType, String targetCode) {
        return switch (targetType) {
            case DISTRICT -> findDistrict(targetCode);
            case ADMINISTRATION -> findAdministration(targetCode);
            case COMMERCIAL -> findCommercial(targetCode);
        };
    }

    private Optional<CommunityTargetMeta> findDistrict(String districtCode) {
        DistrictAreaQueryResult result = responseSupport.requestAndUnwrap(
            InternalResponseSupport.DISTRICT_SERVICE,
            () -> communityRegionClient.getDistrict(districtCode)
        );
        return Optional.ofNullable(result)
            .map(area -> new CommunityTargetMeta(CommunityTargetType.DISTRICT, area.districtCode(), area.districtName()));
    }

    private Optional<CommunityTargetMeta> findAdministration(String administrationCode) {
        AdministrationAreaQueryResult result = responseSupport.requestAndUnwrap(
            InternalResponseSupport.DISTRICT_SERVICE,
            () -> communityRegionClient.getAdministration(administrationCode)
        );
        return Optional.ofNullable(result)
            .map(area -> new CommunityTargetMeta(
                CommunityTargetType.ADMINISTRATION, area.administrationCode(), area.administrationName()));
    }

    private Optional<CommunityTargetMeta> findCommercial(String commercialCode) {
        CommercialAreaQueryResult result = responseSupport.requestAndUnwrap(
            InternalResponseSupport.DISTRICT_SERVICE,
            () -> communityRegionClient.getCommercialAdministration(commercialCode)
        );
        return Optional.ofNullable(result)
            .map(area -> new CommunityTargetMeta(
                CommunityTargetType.COMMERCIAL, area.commercialCode(), area.commercialName()));
    }
}
