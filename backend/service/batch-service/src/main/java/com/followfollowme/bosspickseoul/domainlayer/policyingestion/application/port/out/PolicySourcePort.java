package com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model.BizinfoNotice;
import java.util.List;

public interface PolicySourcePort {

    List<BizinfoNotice> fetchAll();
}
