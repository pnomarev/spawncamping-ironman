/*jslint node: true */
/*jslint nomen: true */
/*
 * Copyright (c) 2014 TopCoder, Inc. All rights reserved.
 */
"use strict";

/**
 * Represents RSS feed generation.
 *
 * @version 1.0
 * @author pnomarev
 * @since 1.0 topcoder challenges listing endpoints translation/proxy to RSS
 */
var async = require('async');
var config = require("../config/configuration");
var util = require('util');

var Client = require('node-rest-client').Client;

var path = require('path');
var fs = require("fs");
var rssFeeds = require('../config/rss');

var ejs = require('ejs');
var fs = require('fs');

var rssTemplate = fs.readFileSync('views/rss.ejs', 'utf8');

var cache = {};
var cacheQueue = {}; //require('node-cache');
//var rssCache = new Cache( { stdTTL: config.timeoutCache, checkperiod: config.timeoutCache+10 } );
//var rssCache = new Cache( { stdTTL: 6000, checkperiod: 5+10 } );

var moment = require('moment-timezone');

/**
 * Convert moment date to string, using configured timezone
 * @param {Object} moment object to format.
 * @since 1.0
 */
function formatDate(date) {
    return date.tz(config.rssDateTimeZone).format(config.rssDateFormat);
}

/**
 * Generate a value based on template provided
 * @param {Object} key-value object - the source for substitution
 * @param {Object} template configuration to use
 * @since 1.0
 */
function getField(item, source) {
    if (typeof source === "string" && source.substring(0, 1) === "=") {
        return source.substring(1);
    }
    if (source.template) {
        //substitute
        var result = source.template || "",
            params = source.parameters || [];

        params.forEach(function (prm) { result = result.replace('{' + prm + '}', item[prm]); });

        return result;
    }
    return item[source];
}

function getChallengeURL(item, feedConfig) {
    var challengeCommunity = getField(item, feedConfig.challengeCommunity);
    var linkConfig = rssFeeds.links[challengeCommunity];
    return getField(item, linkConfig);
}

function sendRSS(source, req, res) {
    var ret = ejs.render(rssTemplate,
            {   rssData : source,
                sourceURL : config.rssFeedHost + req.originalUrl,
                sourceLink : config.rssFeedHost });
    res.contentType('text/xml');
    res.end(ret);
}

function convertToRSS(rssJSON, defaultCommunity, defaultFieldMap, callback) {
    var rssObject = [],
        i,
        item,
        itemChallengeCommunity,
        fieldMap,
        postingDate,
        transformedItem;

    if (rssJSON.data) {
        for (i = 0; i < rssJSON.data.length; ++i) {
            item = rssJSON.data[i];
            itemChallengeCommunity = defaultCommunity || item.challengeCommunity;
            fieldMap = rssFeeds.fieldsMap[defaultFieldMap || itemChallengeCommunity];
            postingDate = moment(item[fieldMap.postingDate]);
            transformedItem = {
                title : getField(item, fieldMap.title),
                link : getChallengeURL(item, fieldMap),
                pubDate : formatDate(postingDate),
                guid : getField(item, fieldMap.guid),
                sortDate : postingDate,
                filtering : {
                    contestType : itemChallengeCommunity,
                    challengeType : getField(item, fieldMap.challengeType),
                    platforms : getField(item, fieldMap.platforms),
                    technologies : getField(item, fieldMap.technologies)
                }
            };
            rssObject.push(transformedItem);
        }
    }
	callback(rssObject, rssJSON.total);
    return;
}

function getCachedItem(key) {
    return cache[key];
}

function setCachedItem(key, item) {
    cache[key] = {
        cacheExpireTime : moment().add(config.timeoutCache, "seconds"),
        cachedData : item
    };
}

function stringSetToArray(stringSet) {
    var ret = [];
    stringSet.split(',').forEach(function (item) { ret.push(item); });
    return ret;
}

function matchSet(stringSet, arraySet) {
    stringSet = stringSet || "";
    arraySet = arraySet || [];

    if ("" === stringSet) { return true; }
    var arraySet2 = stringSetToArray(stringSet),
        ret = false;

    arraySet.forEach(
        function (item1) {
            arraySet2.forEach(
                function (item2) {
                    if (item1 === item2) {
                        ret = true;
                    }
                }
            );
        }
    );
    return ret;
}

function filterFeed(source, filters) {
    var result = [];

    source.forEach(function (item) {
        var match = false;
        //console.log(item.filtering.contestType + "   " + filters.contestType);

        if (filters.contestType === "all" || item.filtering.contestType === filters.contestType) {
            match = true;
        }

        if (match) {
            if (!("" === filters.challengeType || item.filtering.challengeType === filters.challengeType)) {
                match = false;
            }
        }

        if (match) {
            if (!matchSet(filters.technologies, item.filtering.technologies)) {
                match = false;
            }
        }

        if (match) {
            if (!matchSet(filters.platforms, item.filtering.platforms)) {
                match = false;
            }
        }

        if (match) {
            result.push(item);
        }
    });

    result.sort(function (a, b) { return a.sortDate.isBefore(b.sortDate) ? 1 : (a.sortDate.isAfter(b.sortDate) ? -1 : 0); });
    return result;
}

function pageRequestURL(url, pageIndex) {
	return url.replace("{pagination}", "pageIndex=" + pageIndex + "&pageSize=" + config.pageSize);
}

function requestData(url, callbacks) {
	var client = new Client(),
        options = {
            requestConfig : {timeout : config.timeoutAPI * 1000 /*convert to ms*/},
            responseConfig : {timeout : config.timeoutAPI * 1000 /*convert to ms*/}
        };

    var restRequest = client.get(url, options, function (data,response) {
		callbacks.success(data);
    });
    
    restRequest.on('requestTimeout', function (where) {
        callbacks.timeout("request timeout");
    });

    restRequest.on('responseTimeout', function (where) {
        callbacks.timeout("response timeout");
    });

    restRequest.on('error', function (err) {
        callbacks.error(err);
    });
}

function processAdditionalPages(url, cummulativeData, total, challengeCommunity, fieldMap, sendResult, callbacks) {
	var pages = [],
		i, tmp;
	for ( i = 2, tmp = cummulativeData.length; tmp < total; tmp += config.pageSize, i++) {
		pages.push(i);
	}
	
	async.eachLimit(pages, config.limitAPIcalls, function (pageIndex, cb) {
			requestData(pageRequestURL(url, pageIndex), {
					success : function (data) {
					
						var rssJSON = JSON.parse(data);
						
						convertToRSS(rssJSON, challengeCommunity, fieldMap, function(pageData, total) {
							console.log("pageData.length=" + pageData.length + "  total=" + total);
							
							cummulativeData.push.apply(cummulativeData, pageData);
							
							cb();
						});
					},
					timeout : function (err) {
						cb(err);
					},
					error : function (err) {
						cb(err);
					}
				}
			);
		},
		function (err) {
			if (err) {
				cacheQueue[url] = false;
				callbacks.timeout();
			} else {
				setCachedItem(url, cummulativeData);
				cacheQueue[url] = false;

				callbacks.success(cummulativeData);
			}
		}
	);
}

function placeAPIRequest(url, challengeCommunity, fieldMap, callbacks) {
    if (cacheQueue[url]) {
		console.log("already in queue: " + url);
        callbacks.timeout();
        return;
    }

    cacheQueue[url] = true;

	var sendResult = true;
	
	requestData(pageRequestURL(url, 1), {
		success : function (data) {
			console.log("response received!");
			var rssJSON = JSON.parse(data);                

			convertToRSS(rssJSON, challengeCommunity, fieldMap, function(data, total) {
				console.log("data.length=" + data.length + "  total=" + total);
				
				if (data.length < total) {
					//request additional pages
					processAdditionalPages(url, data, total, challengeCommunity, fieldMap, sendResult, callbacks);
				} else {
					setCachedItem(url, data);
					cacheQueue[url] = false;
					
					if(sendResult) {
						callbacks.success(data);
					}
				}
			});
		},
		timeout : function (err) {
			console.log("timeout!");
			if (sendResult) {
				callbacks.timeout();
			}
			sendResult = false;
		}
	});
}

function processURL(url, challengeCommunity, fieldMap, callbacks) {
    console.log("processing url:" + url);
    
    var cacheKey = url;
    
    var cachedItem = getCachedItem(cacheKey);
    
    var cacheExpireTime = cachedItem ? cachedItem.cacheExpireTime : null;
    var cachedData = cachedItem ? cachedItem.cachedData : null;
    
    if (cachedItem && cacheExpireTime.isAfter(moment())) {
    
		console.log("in cache: " + url);
        callbacks.success(cachedData);
        
    } else {
        
		console.log("requesting new data: " + url);
        placeAPIRequest(url,
            challengeCommunity,
            fieldMap,
            {   success: function (data) {
                    callbacks.success(data);
                },
                timeout: function () {
                    if (cachedData) {
						console.log("timedout, but there is old data in cache: " + url);
                        callbacks.success(cachedData);
                    } else {
                        callbacks.error("");
                    }
                }
            }
        );
        
    }
    
    return;

}

function processURLs(urlsConfig, filters, callbacks) {
    var data = [];
    
    var atLeastOneSuccess = false;
    
    async.each(urlsConfig, function (urlConfig, cb) {
        processURL(urlConfig.url, urlConfig.challengeCommunity, urlConfig.fieldMapping, {
            success : function (result) { data.push.apply(data, result); atLeastOneSuccess = true; cb(); },
            error : function (err) { cb(err); }
        });
        
    }, function (err) {
        
        if (atLeastOneSuccess) {
            data = filterFeed(data, filters);
            
            callbacks.success(data);
        } else {
            if (err) {
                callbacks.error({message : err, status : 500});
            } else {
                callbacks.error({message : "", status : 202});
            }
        }
    });
}

/**
 * TODO
 * @param {Object} req the express req object.
 * @param {Object} res the express res object.
 * @param {Function} callback the callback function.
 * @since 1.0
 */
function fetchRSS(req, res, next) {

    var activityType = req.query.list || "all";  //active, past, upcoming
    var contestType = req.query.contestType || "all"; //develop, design, data
    var challengeType = req.query.challengeType || ""; //First2Finish, Code, Assembly, etc.
    var technologies = req.query.technologies || "";
    var platforms = req.query.platforms || "";

    var feedURLs = rssFeeds.feeds[activityType];

    var filters = { activityType : activityType,
                    contestType : contestType,
                    challengeType : challengeType,
                    technologies : technologies,
                    platforms : platforms};

    processURLs(feedURLs, filters, {
        success : function (data) {
            sendRSS(data, req, res);
            next();
            return;
        },
        error : function (err) {
            res.send(err.message, err.status);
            next();
            return;
        }
    });
}

module.exports = {
    fetchRSS: fetchRSS
};
