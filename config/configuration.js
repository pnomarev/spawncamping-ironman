/*
 * Copyright (c) 2014 TopCoder, Inc. All rights reserved.
 */
"use strict";
/**
 * Represents main configuration file
 * <p>
 * Changed Notes:
 *
 * Version 1.0 topcoder challenges listing endpoints translation/proxy to RSS
 *  - 
 * </p>
 *
 * @version 1.0
 * @author pnomarev
 * @since 1.0 (topcoder challenges listing endpoints translation/proxy to RSS)
 */

module.exports = {
	SERVER_PORT : process.env.PORT || 3000,
    timeoutCache: process.env.TIME_OUT_CACHE || 30*60, //in seconds
	timeoutAPI: process.env.TIME_OUT_API || 10, //in seconds
	hostAPI: process.env.HOST_API || 'https://api.topcoder.com',
	
	rssFeedHost : 'https://www.topcoder.com',
	rssDateTimeZone : 'America/New_York',
	rssDateFormat : 'DD MMM YYYY HH:mm z',
	pageSize : 50,
	limitAPIcalls : 10
	
};