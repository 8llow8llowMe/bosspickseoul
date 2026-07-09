package com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.entity.CommercialRegionMappingEntity;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.repository.CommercialRegionMappingRepository;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.RegionCodeLookupInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.mapper.CommercialRegionMappingMapper;
import com.followfollowme.nowdoboss.domainlayer.region.application.port.out.CommercialRegionMappingRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.region.domain.model.CommercialRegionMapping;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommercialRegionMappingRepositoryAdapter implements CommercialRegionMappingRepositoryPort {

    private final CommercialRegionMappingRepository commercialRegionMappingRepository;
    private final CommercialRegionMappingMapper commercialRegionMappingMapper;

    @Override
    public List<CommercialRegionMapping> findAllByDistrictCode(String districtCode) {
        List<CommercialRegionMappingEntity> entities = commercialRegionMappingRepository.findAllByDistrictCode(districtCode);
        return commercialRegionMappingMapper.toDomainListFromEntityList(entities);
    }

    @Override
    public List<CommercialRegionMapping> findAllByAdministrationCode(String administrationCode) {
        List<CommercialRegionMappingEntity> entities = commercialRegionMappingRepository.findAllByAdministrationCode(administrationCode);
        return commercialRegionMappingMapper.toDomainListFromEntityList(entities);
    }

    @Override
    public Optional<RegionCodeLookupInfo> findDistinctByDistrictName(String districtName) {
        return commercialRegionMappingRepository.findDistinctByDistrictName(districtName)
            .map(RegionCodeLookupInfo::from);
    }

    @Override
    public Optional<RegionCodeLookupInfo> findDistinctByAdministrationName(String administrationName) {
        return commercialRegionMappingRepository.findDistinctByAdministrationName(administrationName)
            .map(RegionCodeLookupInfo::from);
    }

    @Override
    public Optional<RegionCodeLookupInfo> findDistinctByCommercialName(String commercialName) {
        return commercialRegionMappingRepository.findDistinctByCommercialName(commercialName)
            .map(RegionCodeLookupInfo::from);
    }

    @Override
    public Optional<CommercialRegionMapping> findFirstByAdministrationCode(String administrationCode) {
        return commercialRegionMappingRepository.findFirstByAdministrationCode(administrationCode)
            .map(commercialRegionMappingMapper::toDomainFromEntity);
    }

    @Override
    public Optional<CommercialRegionMapping> findFirstByCommercialCode(String commercialCode) {
        return commercialRegionMappingRepository.findFirstByCommercialCode(commercialCode)
            .map(projection -> CommercialRegionMapping.builder()
                .districtCode(projection.getDistrictCode())
                .districtName(projection.getDistrictName())
                .administrationCode(projection.getAdministrationCode())
                .administrationName(projection.getAdministrationName())
                .build());
    }
}
