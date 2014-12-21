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

 var config = require("../config/configuration");
 
module.exports = {
	fieldsMap : {
		all : {
			title : 'challengeName',
			challengeId : 'challengeId',
			challengeCommunity : 'challengeCommunity',
			challengeType : 'challengeType',
			guid : 'challengeId',
			postingDate : 'postingDate',
			technologies : 'technologies',
			platforms : 'platforms'
		},
		design : {
			title : 'challengeName',
			challengeId : 'challengeId',
			challengeCommunity : '=design',
			challengeType : 'challengeType',
			guid : 'challengeId',
			postingDate : 'registrationStartDate',
			technologies : 'technologies',
			platforms : 'platforms'
		},
		develop : {
			title : 'challengeName',
			challengeId : 'challengeId',
			challengeCommunity : '=develop',
			challengeType : 'challengeType',
			guid : 'challengeId',
			postingDate : 'registrationStartDate',
			technologies : 'technologies',
			platforms : 'platforms'
		},
		data : {
			title : 'fullName',
			challengeId : 'problemId',
			challengeCommunity : '=data',
			challengeType : 'challengeType',
			guid : { template:'{roundId}-{problemId}', parameters:['roundId', 'problemId']},
			postingDate : 'startDate',
			technologies : 'technologies',
			platforms : 'platforms'
		}
	},
	links : {
		design : { template:'https://www.topcoder.com/challenge-details/{challengeId}?type={challengeCommunity}', parameters: ['challengeId', 'challengeCommunity']},
		develop : { template:'https://www.topcoder.com/challenge-details/{challengeId}?type={challengeCommunity}', parameters: ['challengeId', 'challengeCommunity']},
		data : { template:'https://community.topcoder.com/longcontest/?module=ViewProblemStatement&rd={roundId}&pm={problemId}', parameters: ['roundId', 'problemId']}
	},
	feeds : {
		all : [ { url: config.hostAPI + '/v2/challenges/?{pagination}', 
					challengeCommunity: null,
					fieldMapping : 'all'}, 
				{ url: config.hostAPI + '/v2/data/marathon/challenges/?listType=active&{pagination}', 
					challengeCommunity: 'data'}],
				
		active : [ { url: config.hostAPI + '/v2/challenges/active?{pagination}', 
						challengeCommunity: null}, 
					{ url: config.hostAPI + '/v2/data/marathon/challenges/?listType=active&{pagination}',
						challengeCommunity: 'data'}],
					
		upcoming : [ { url: config.hostAPI + '/v2/challenges/upcoming?{pagination}',
						challengeCommunity: null}, 
					{ url: config.hostAPI + '/v2/data/marathon/challenges/?listType=upcoming&{pagination}',
						challengeCommunity: 'data'}],
					
		past : [ { url: config.hostAPI + '/v2/challenges/past?{pagination}',
						challengeCommunity: null}, 
				{ url: config.hostAPI + '/v2/data/marathon/challenges/?listType=past&{pagination}',
						challengeCommunity: 'data'}]
	}
};