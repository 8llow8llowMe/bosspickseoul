package com.followfollowme.nowdoboss.domainlayer.region.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.region.application.info.AdministrationAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.info.CommercialAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.region.application.port.out.AreaCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.region.application.port.out.CoordinateTransformPort;
import com.followfollowme.nowdoboss.domainlayer.region.domain.model.AreaCommercial;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RegionQueryProcessor {

    private final AreaCommercialRepositoryPort areaCommercialRepositoryPort;
    private final CoordinateTransformPort coordinateTransformPort;

    public List<AdministrationAreaInfo> getAdministrationsByDistrictCode(String districtCode) {
        List<AreaCommercial> areas = areaCommercialRepositoryPort.findAllByDistrictCode(districtCode);

        Set<String> seen = new HashSet<>();

        return areas.stream()
            .filter(area -> seen.add(area.administrationCode()))
            .map(area -> {
                Point center = coordinateTransformPort.toWgs84(area.x(), area.y());
                return AdministrationAreaInfo.from(
                    area.administrationCode(),
                    area.administrationCodeName(),
                    center
                );
            })
            .toList();
    }

    public List<CommercialAreaInfo> getCommercialsByAdministrationCode(String administrationCode) {
        return areaCommercialRepositoryPort.findAllByAdministrationCode(administrationCode)
            .stream()
            .map(area -> {
                Point center = coordinateTransformPort.toWgs84(area.x(), area.y());
                return CommercialAreaInfo.from(area, center);
            })
            .toList();
    }
}
