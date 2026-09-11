package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.SalesDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.SalesDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.DistrictSalesQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.query.DistrictServiceSalesQueryResult;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DistrictSalesQueryAdapter implements DistrictSalesQueryPort {

    private final SalesDistrictRepository salesDistrictRepository;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public Optional<DistrictServiceSalesQueryResult> findByPeriodCodeAndDistrictCodeAndServiceCode(
        String periodCode, String districtCode, String serviceCode
    ) {
        return salesDistrictRepository.findByPeriodCodeAndDistrictCodeAndServiceCodeAndSpatialVersion(
                periodCode, districtCode, serviceCode, datasetSpatialVersion.value())
            .map(this::toQueryResult);
    }

    @Override
    public List<DistrictServiceSalesQueryResult> findAllByPeriodCodesAndDistrictCodeAndServiceCode(
        List<String> periodCodes, String districtCode, String serviceCode
    ) {
        return salesDistrictRepository.findAllByPeriodCodeInAndDistrictCodeAndServiceCodeAndSpatialVersion(
                periodCodes, districtCode, serviceCode, datasetSpatialVersion.value())
            .stream()
            .map(this::toQueryResult)
            .toList();
    }

    private DistrictServiceSalesQueryResult toQueryResult(SalesDistrictEntity entity) {
        return DistrictServiceSalesQueryResult.builder()
            .periodCode(entity.getPeriodCode())
            .monthlySalesAmount(zeroIfNull(entity.getMonthlySalesAmount()))
            .maleSalesAmount(zeroIfNull(entity.getMaleSalesAmount()))
            .femaleSalesAmount(zeroIfNull(entity.getFemaleSalesAmount()))
            .age10SalesAmount(zeroIfNull(entity.getAge10SalesAmount()))
            .age20SalesAmount(zeroIfNull(entity.getAge20SalesAmount()))
            .age30SalesAmount(zeroIfNull(entity.getAge30SalesAmount()))
            .age40SalesAmount(zeroIfNull(entity.getAge40SalesAmount()))
            .age50SalesAmount(zeroIfNull(entity.getAge50SalesAmount()))
            .age60PlusSalesAmount(zeroIfNull(entity.getAge60PlusSalesAmount()))
            .build();
    }

    private long zeroIfNull(Long value) {
        return Objects.requireNonNullElse(value, 0L);
    }
}
