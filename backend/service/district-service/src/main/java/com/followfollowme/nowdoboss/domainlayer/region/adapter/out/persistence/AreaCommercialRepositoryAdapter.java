package com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.entity.AreaCommercialEntity;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.repository.AreaCommercialRepository;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.RegionCodeLookupInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.mapper.AreaCommercialMapper;
import com.followfollowme.nowdoboss.domainlayer.region.application.port.out.AreaCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.region.domain.model.AreaCommercial;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AreaCommercialRepositoryAdapter implements AreaCommercialRepositoryPort {

    private final AreaCommercialRepository areaCommercialRepository;
    private final AreaCommercialMapper areaCommercialMapper;

    @Override
    public List<AreaCommercial> findAllByDistrictCode(String districtCode) {
        List<AreaCommercialEntity> entities = areaCommercialRepository.findAllByDistrictCode(districtCode);
        return areaCommercialMapper.toDomainListFromEntityList(entities);
    }

    @Override
    public List<AreaCommercial> findAllByAdministrationCode(String administrationCode) {
        List<AreaCommercialEntity> entities = areaCommercialRepository.findAllByAdministrationCode(administrationCode);
        return areaCommercialMapper.toDomainListFromEntityList(entities);
    }

    @Override
    public Optional<RegionCodeLookupInfo> findDistinctByDistrictCodeName(String districtCodeName) {
        return areaCommercialRepository.findDistinctByDistrictCodeName(districtCodeName)
            .map(RegionCodeLookupInfo::from);
    }

    @Override
    public Optional<RegionCodeLookupInfo> findDistinctByAdministrationCodeName(String administrationCodeName) {
        return areaCommercialRepository.findDistinctByAdministrationCodeName(administrationCodeName)
            .map(RegionCodeLookupInfo::from);
    }

    @Override
    public Optional<RegionCodeLookupInfo> findDistinctByCommercialCodeName(String commercialCodeName) {
        return areaCommercialRepository.findDistinctByCommercialCodeName(commercialCodeName)
            .map(RegionCodeLookupInfo::from);
    }

    @Override
    public Optional<AreaCommercial> findFirstByAdministrationCode(String administrationCode) {
        return areaCommercialRepository.findFirstByAdministrationCode(administrationCode)
            .map(areaCommercialMapper::toDomainFromEntity);
    }

    @Override
    public Optional<AreaCommercial> findFirstByCommercialCode(String commercialCode) {
        return areaCommercialRepository.findFirstByCommercialCode(commercialCode)
            .map(projection -> AreaCommercial.builder()
                .districtCode(projection.getDistrictCode())
                .districtCodeName(projection.getDistrictCodeName())
                .administrationCode(projection.getAdministrationCode())
                .administrationCodeName(projection.getAdministrationCodeName())
                .build());
    }
}
