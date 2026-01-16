package com.followfollowme.nowdoboss.domainlayer.region.application.port.out;

import org.locationtech.jts.geom.Point;

public interface CoordinateTransformPort {

    Point toWgs84(double x, double y);
}
