package com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.entity.AreaCommercialEntity;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.repository.AreaCommercialRepository;
import com.followfollowme.nowdoboss.domainlayer.region.application.mapper.AreaCommercialMapper;
import com.followfollowme.nowdoboss.domainlayer.region.application.port.out.AreaCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.region.domain.model.AreaCommercial;
import java.util.List;
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
}
