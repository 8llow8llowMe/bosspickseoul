package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.PensionIncomeDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.application.mapper.PensionIncomeDistrictMapper;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.DistrictPensionIncomeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.PensionIncomeDistrict;
import java.time.LocalDate;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DistrictPensionIncomeRepositoryAdapter implements DistrictPensionIncomeRepositoryPort {

    private final PensionIncomeDistrictRepository pensionIncomeDistrictRepository;
    private final PensionIncomeDistrictMapper pensionIncomeDistrictMapper;

    @Override
    public Optional<PensionIncomeDistrict> findLatestByDistrictCodeOnOrBefore(String districtCode, LocalDate referenceDate) {
        return pensionIncomeDistrictRepository
            .findFirstByDistrictCodeAndReferenceDateLessThanEqualOrderByReferenceDateDesc(districtCode, referenceDate)
            .map(pensionIncomeDistrictMapper::toDomainFromEntity);
    }
}
