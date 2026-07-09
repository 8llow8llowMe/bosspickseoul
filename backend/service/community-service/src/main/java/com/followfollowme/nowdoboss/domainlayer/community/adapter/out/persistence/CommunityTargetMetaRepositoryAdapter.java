package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.CommercialRegionReferenceRepository;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityTargetMetaRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityTargetMeta;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityTargetMetaRepositoryAdapter implements CommunityTargetMetaRepositoryPort {

    private final CommercialRegionReferenceRepository commercialRegionReferenceRepository;

    @Override
    public Optional<CommunityTargetMeta> findTargetMeta(CommunityTargetType targetType, String targetCode) {
        return switch (targetType) {
            case DISTRICT -> commercialRegionReferenceRepository.findFirstByDistrictCode(targetCode)
                .map(area -> new CommunityTargetMeta(targetType, area.getDistrictCode(), area.getDistrictName()));
            case ADMINISTRATION -> commercialRegionReferenceRepository.findFirstByAdministrationCode(targetCode)
                .map(area -> new CommunityTargetMeta(targetType, area.getAdministrationCode(), area.getAdministrationName()));
            case COMMERCIAL -> commercialRegionReferenceRepository.findFirstByCommercialCode(targetCode)
                .map(area -> new CommunityTargetMeta(targetType, area.getCommercialCode(), area.getCommercialName()));
        };
    }
}
