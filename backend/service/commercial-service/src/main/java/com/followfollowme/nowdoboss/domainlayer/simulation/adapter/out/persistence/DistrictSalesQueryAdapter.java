package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity.SalesDistrictEntity;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository.SalesDistrictRepository;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.DistrictSalesQueryPort;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.query.DistrictServiceSalesQueryResult;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DistrictSalesQueryAdapter implements DistrictSalesQueryPort {

    private final SalesDistrictRepository salesDistrictRepository;

    @Override
    public Optional<DistrictServiceSalesQueryResult> findByPeriodCodeAndDistrictCodeAndServiceCode(
        String periodCode, String districtCode, String serviceCode
    ) {
        return salesDistrictRepository.findByPeriodCodeAndDistrictCodeAndServiceCode(periodCode, districtCode, serviceCode)
            .map(this::toQueryResult);
    }

    @Override
    public List<DistrictServiceSalesQueryResult> findAllByPeriodCodesAndDistrictCodeAndServiceCode(
        List<String> periodCodes, String districtCode, String serviceCode
    ) {
        return salesDistrictRepository.findAllByPeriodCodeInAndDistrictCodeAndServiceCode(periodCodes, districtCode, serviceCode)
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
