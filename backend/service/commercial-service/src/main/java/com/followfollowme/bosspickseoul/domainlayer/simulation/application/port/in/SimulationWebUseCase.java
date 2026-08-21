package com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.request.SimulationHistorySaveRequest;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.request.SimulationReportRequest;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationFranchiseesResponse;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationHistoriesResponse;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationHistorySaveResponse;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationReportResponse;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationStoreSizesResponse;

public interface SimulationWebUseCase {

    SimulationStoreSizesResponse getStoreSizes(String serviceCode);

    SimulationFranchiseesResponse searchFranchisees(String serviceCode, String keyword, Long lastId);

    SimulationReportResponse simulate(SimulationReportRequest request);

    SimulationHistorySaveResponse saveHistory(long memberId, SimulationHistorySaveRequest request);

    SimulationHistoriesResponse getHistories(long memberId, int page, int size);
}
