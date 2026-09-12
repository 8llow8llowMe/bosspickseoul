package com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.entity.CommercialRegionMappingEntity;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.repository.CommercialRegionMappingRepository;
import com.followfollowme.bosspickseoul.domainlayer.region.application.mapper.CommercialRegionMappingMapper;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.CommercialRegionMappingRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.query.DistrictAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.query.RegionCodeLookupQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.region.domain.model.CommercialRegionMapping;
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
    public List<RegionCodeLookupQueryResult> findDistinctByDistrictName(String districtName) {
        return commercialRegionMappingRepository.findDistinctByDistrictName(districtName)
            .stream()
            .map(commercialRegionMappingMapper::toQueryResultFromProjection)
            .toList();
    }

    @Override
    public List<RegionCodeLookupQueryResult> findDistinctByAdministrationName(String administrationName) {
        return commercialRegionMappingRepository.findDistinctByAdministrationName(administrationName)
            .stream()
            .map(commercialRegionMappingMapper::toQueryResultFromProjection)
            .toList();
    }

    @Override
    public List<RegionCodeLookupQueryResult> findDistinctByCommercialName(String commercialName) {
        return commercialRegionMappingRepository.findDistinctByCommercialName(commercialName)
            .stream()
            .map(commercialRegionMappingMapper::toQueryResultFromProjection)
            .toList();
    }

    @Override
    public Optional<CommercialRegionMapping> findFirstByAdministrationCode(String administrationCode) {
        return commercialRegionMappingRepository.findFirstByAdministrationCode(administrationCode)
            .map(commercialRegionMappingMapper::toDomainFromEntity);
    }

    @Override
    public Optional<CommercialRegionMapping> findFirstByCommercialCode(String commercialCode) {
        return commercialRegionMappingRepository.findFirstByCommercialCode(commercialCode)
            .map(commercialRegionMappingMapper::toDomainFromProjection);
    }

    @Override
    public Optional<DistrictAreaQueryResult> findFirstByDistrictCode(String districtCode) {
        return commercialRegionMappingRepository.findFirstByDistrictCode(districtCode)
            .map(commercialRegionMappingMapper::toDistrictAreaQueryResultFromProjection);
    }
}
