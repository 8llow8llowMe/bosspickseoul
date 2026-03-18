package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.AreaCommercialReferenceRepository;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityTargetMetaPort;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityTargetMeta;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityTargetMetaPersistenceAdapter implements CommunityTargetMetaPort {

    private final AreaCommercialReferenceRepository areaCommercialReferenceRepository;

    @Override
    public Optional<CommunityTargetMeta> findTargetMeta(CommunityTargetType targetType, String targetCode) {
        return switch (targetType) {
            case DISTRICT -> areaCommercialReferenceRepository.findFirstByDistrictCode(targetCode)
                .map(area -> new CommunityTargetMeta(targetType, area.getDistrictCode(), area.getDistrictCodeName()));
            case ADMINISTRATION -> areaCommercialReferenceRepository.findFirstByAdministrationCode(targetCode)
                .map(area -> new CommunityTargetMeta(targetType, area.getAdministrationCode(), area.getAdministrationCodeName()));
            case COMMERCIAL -> areaCommercialReferenceRepository.findFirstByCommercialCode(targetCode)
                .map(area -> new CommunityTargetMeta(targetType, area.getCommercialCode(), area.getCommercialCodeName()));
        };
    }
}
