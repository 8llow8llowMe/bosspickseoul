package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository.ChangeDistrictRepository;
import com.followfollowme.nowdoboss.domainlayer.district.application.mapper.ChangeDistrictMapper;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.ChangeDistrictRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.district.domain.model.ChangeDistrict;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ChangeDistrictRepositoryAdapter implements ChangeDistrictRepositoryPort {

    private final ChangeDistrictRepository changeDistrictRepository;
    private final ChangeDistrictMapper changeDistrictMapper;

    @Override
    public Optional<ChangeDistrict> findByPeriodCodeAndDistrictCode(String periodCode, String districtCode) {
        return changeDistrictRepository.findByPeriodCodeAndDistrictCode(periodCode, districtCode)
            .map(changeDistrictMapper::toDomainFromEntity);
    }
}
