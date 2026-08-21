package com.followfollowme.bosspickseoul.apigateway.config;

import com.followfollowme.bosspickseoul.common.config.JasyptPropertiesConfig;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import(JasyptPropertiesConfig.class)
public class ApiGatewayPropertiesConfig {

}
