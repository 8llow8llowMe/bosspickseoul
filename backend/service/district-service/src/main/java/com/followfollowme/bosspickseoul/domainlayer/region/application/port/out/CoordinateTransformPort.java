package com.followfollowme.bosspickseoul.domainlayer.region.application.port.out;

import org.locationtech.jts.geom.Point;

public interface CoordinateTransformPort {

    Point toWgs84(double x, double y);
}
