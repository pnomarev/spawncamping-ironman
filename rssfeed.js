/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
"use strict";

/**
 * Represents main application entry
 * @version 1.0
 * @author pnomarev
 * 1.0 topcoder challenges listing endpoints translation/proxy to RSS
 */

exports.init = function () {
	var express = require('express');
	var http = require('http');
	var path = require('path');
	var ejs = require('ejs');
	var winston = require("winston");
	var app = express();
	var rss = require('./app/rss.js');
	
	var config = require("./config/configuration");

	app.set('port', config.SERVER_PORT);
	// render html page
	app.set('views', path.join(__dirname, '/views'));
	app.engine('html', ejs.renderFile);
	app.use( "/challenges/feed", express.static(path.join(__dirname, 'views/xsl')));
	
	app.use(express.logger('dev'));
	
	app.use(express.urlencoded());
	
	app.use(express.cookieParser());
	app.use(express.session({
			secret: "session secret"
		}));

	app.use(app.router);

	app.get("/challenges/feed", rss.fetchRSS);

	//start the app
	http.createServer(app).listen(app.get('port'), function () {
		winston.info('Express server listening on port ' + app.get('port'));
	});
}