package com.followfollowme.bosspickseoul.domainlayer.region.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.region.application.exception.RegionErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.region.application.exception.RegionException;
import com.followfollowme.bosspickseoul.domainlayer.region.application.info.AdministrationAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.region.application.info.AdministrationDistrictAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.region.application.info.CommercialAdministrationAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.region.application.info.CommercialAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.region.application.info.DistrictAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.region.application.info.RegionCodeLookupInfo;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.CommercialRegionMappingRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.CoordinateTransformPort;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.query.RegionCodeLookupQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.region.domain.enums.RegionCodeType;
import com.followfollowme.bosspickseoul.domainlayer.region.domain.model.CommercialRegionMapping;
import com.followfollowme.bosspickseoul.domainlayer.region.domain.model.Wgs84Coordinate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
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
                Wgs84Coordinate center = coordinateTransformPort.toWgs84(area.x(), area.y());
                return AdministrationAreaInfo.from(area.administrationCode(), area.administrationName(), center);
            })
            .toList();
    }

    public List<CommercialAreaInfo> getCommercialsByAdministrationCode(String districtCode, String administrationCode) {
        if (!administrationCode.startsWith(districtCode)) {
            throw new RegionException(RegionErrorCode.ADMINISTRATION_NOT_IN_DISTRICT, administrationCode, districtCode);
        }

        return commercialRegionMappingRepositoryPort.findAllByAdministrationCode(administrationCode)
            .stream()
            .map(area -> {
                Wgs84Coordinate center = coordinateTransformPort.toWgs84(area.x(), area.y());
                return CommercialAreaInfo.from(area, center);
            })
            .toList();
    }

    public RegionCodeLookupInfo lookupRegionCode(RegionCodeType type, String name) {
        List<RegionCodeLookupQueryResult> found = switch (type) {
            case DISTRICT -> commercialRegionMappingRepositoryPort.findDistinctByDistrictName(name);
            case ADMINISTRATION -> commercialRegionMappingRepositoryPort.findDistinctByAdministrationName(name);
            case COMMERCIAL -> commercialRegionMappingRepositoryPort.findDistinctByCommercialName(name);
        };

        if (found.isEmpty()) {
            throw new RegionException(notFoundErrorCodeOf(type), name);
        }
        if (found.size() > 1) {
            // DISTINCT 는 선택된 컬럼 조합에만 걸린다. 자치구가 다른 동명 행정동(신사동 등)과
            // 동명 상권은 접히지 않으므로 여기까지 다건이 올라온다. 예전에는 Optional 반환이라
            // IncorrectResultSizeDataAccessException 으로 500 이 났다.
            throw new RegionException(RegionErrorCode.AMBIGUOUS_REGION_NAME, name);
        }
        return RegionCodeLookupInfo.from(found.get(0));
    }

    public AdministrationDistrictAreaInfo getAdministrationDistrictByAdministrationCode(String administrationCode) {
        CommercialRegionMapping commercialRegionMapping = commercialRegionMappingRepositoryPort.findFirstByAdministrationCode(administrationCode)
            .orElseThrow(() -> new RegionException(RegionErrorCode.NOT_FOUND_ADMINISTRATION, administrationCode));
        return AdministrationDistrictAreaInfo.from(commercialRegionMapping);
    }

    public CommercialAdministrationAreaInfo getCommercialAdministrationByCommercialCode(String commercialCode) {
        CommercialRegionMapping commercialRegionMapping = commercialRegionMappingRepositoryPort.findFirstByCommercialCode(commercialCode)
            .orElseThrow(() -> new RegionException(RegionErrorCode.NOT_FOUND_COMMERCIAL, commercialCode));
        return CommercialAdministrationAreaInfo.from(commercialRegionMapping);
    }

    public DistrictAreaInfo getDistrictByDistrictCode(String districtCode) {
        return commercialRegionMappingRepositoryPort.findFirstByDistrictCode(districtCode)
            .map(DistrictAreaInfo::from)
            .orElseThrow(() -> new RegionException(RegionErrorCode.NOT_FOUND_DISTRICT, districtCode));
    }

    private RegionErrorCode notFoundErrorCodeOf(RegionCodeType type) {
        return switch (type) {
            case DISTRICT -> RegionErrorCode.NOT_FOUND_DISTRICT;
            case ADMINISTRATION -> RegionErrorCode.NOT_FOUND_ADMINISTRATION;
            case COMMERCIAL -> RegionErrorCode.NOT_FOUND_COMMERCIAL;
        };
    }
}
