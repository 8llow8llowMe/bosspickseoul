package com.followfollowme.nowdoboss.domainlayer.region.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.region.application.info.AdministrationAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.AdministrationDistrictAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.CommercialAdministrationAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.CommercialAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.RegionCodeLookupInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.port.out.CommercialRegionMappingRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.region.application.port.out.CoordinateTransformPort;
import com.followfollowme.nowdoboss.domainlayer.region.domain.enums.RegionCodeType;
import com.followfollowme.nowdoboss.domainlayer.region.domain.model.CommercialRegionMapping;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RegionQueryProcessor {

    private final CommercialRegionMappingRepositoryPort commercialRegionMappingRepositoryPort;
    private final CoordinateTransformPort coordinateTransformPort;

    public List<AdministrationAreaInfo> getAdministrationsByDistrictCode(String districtCode) {
        List<CommercialRegionMapping> areas = commercialRegionMappingRepositoryPort.findAllByDistrictCode(districtCode);

        Set<String> seen = new HashSet<>();

        return areas.stream()
            .filter(area -> seen.add(area.administrationCode()))
            .map(area -> {
                Point center = coordinateTransformPort.toWgs84(area.x(), area.y());
                return AdministrationAreaInfo.from(area.administrationCode(), area.administrationName(), center);
            })
            .toList();
    }

    public List<CommercialAreaInfo> getCommercialsByAdministrationCode(String districtCode, String administrationCode) {
        if (!administrationCode.startsWith(districtCode)) {
            throw new IllegalArgumentException("행정동 코드가 해당 자치구에 속하지 않습니다.");
        }

        return commercialRegionMappingRepositoryPort.findAllByAdministrationCode(administrationCode)
            .stream()
            .map(area -> {
                Point center = coordinateTransformPort.toWgs84(area.x(), area.y());
                return CommercialAreaInfo.from(area, center);
            })
            .toList();
    }

    public RegionCodeLookupInfo lookupRegionCode(RegionCodeType type, String name) {
        return switch (type) {
            case DISTRICT -> commercialRegionMappingRepositoryPort.findDistinctByDistrictName(name)
                .orElseThrow(() -> new IllegalArgumentException("해당 자치구 코드를 찾을 수 없습니다."));
            case ADMINISTRATION -> commercialRegionMappingRepositoryPort.findDistinctByAdministrationName(name)
                .orElseThrow(() -> new IllegalArgumentException("해당 행정동 코드를 찾을 수 없습니다."));
            case COMMERCIAL -> commercialRegionMappingRepositoryPort.findDistinctByCommercialName(name)
                .orElseThrow(() -> new IllegalArgumentException("해당 상권 코드를 찾을 수 없습니다."));
        };
    }

    public AdministrationDistrictAreaInfo getAdministrationDistrictByAdministrationCode(String administrationCode) {
        CommercialRegionMapping commercialRegionMapping = commercialRegionMappingRepositoryPort.findFirstByAdministrationCode(administrationCode)
            .orElseThrow(() -> new IllegalArgumentException("해당 행정동 코드 정보를 찾을 수 없습니다."));
        return AdministrationDistrictAreaInfo.from(commercialRegionMapping);
    }

    public CommercialAdministrationAreaInfo getCommercialAdministrationByCommercialCode(String commercialCode) {
        CommercialRegionMapping commercialRegionMapping = commercialRegionMappingRepositoryPort.findFirstByCommercialCode(commercialCode)
            .orElseThrow(() -> new IllegalArgumentException("해당 상권 코드 정보를 찾을 수 없습니다."));
        return CommercialAdministrationAreaInfo.from(commercialRegionMapping);
    }
}
