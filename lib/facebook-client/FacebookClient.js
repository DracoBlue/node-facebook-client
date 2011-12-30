/*
 * This file is part of node-facebook-client
 *
 * Copyright (c) 2010 DracoBlue, http://dracoblue.net/
 *
 * Licensed under the terms of MIT License. For the full copyright and license
 * information, please see the LICENSE file in the root folder.
 */

var http = require("http");
var https = require("https");
var connect = require("connect");
var crypto = require("crypto");
var querystring = require("querystring");

var FacebookSession = require("./FacebookSession").FacebookSession;
var FacebookToolkit = require("./FacebookToolkit");

var persist_dict = {};
var persist_fifo = [];
var persist_size = 256 * 256;

function storeAccessTokenById(id, cookie) {
	cookie['user_id'] = id;
	var old_cookie = persist_dict[id];
	if (!old_cookie || parseInt(old_cookie['expires'], 10) <= parseInt(cookie['expires'], 10)) {
		persist_dict[id] = cookie;
		persist_fifo.push(cookie);
	}
	while (persist_fifo.length > persist_size) {
		var rm = persist_fifo.shift();
		if (rm === persist_dict[rm['user_id']])
			delete persist_dict[rm['user_id']];
	}
}

function getAccessTokenById(id) {
	var cookie = persist_dict[id];
	if (cookie) {
		if ((new Date()).getTime() < parseInt(cookie['expires'], 10) * 1000)
			return null;
		return cookie;
	}
	return null;
}

function doRequest(host, port, path, secure, method, data, parser) {
    return function(cb) {
        var protocol = http;
        if(secure) protocol = https;
        var options = {
            host: host,
            port: port,
            path: path,
            method: method || 'GET'
        };
        var request = protocol.request(options, function(response){
            response.setEncoding("utf8");

            var body = [];

            response.on("data", function (chunk) {
                body.push(chunk);
            });

            response.on("end", function () {
                cb(parser(body.join("")));
            });
        });
        if(data != null) {
            request.write(querystring.stringify(data))
        }
        request.end();
    };
};

function doRawJsonRequest(host, port, path, secure, method, data) {
    return doRequest(host, port, path, secure, method, data, JSON.parse);
};

function doRawQueryRequest(host, port, path, secure, method, data) {
    return doRequest(host, port, path, secure, method, data, querystring.parse);
};

var FacebookClient = function(app_id, app_secret, options) {
    var self = this;

    this.options = options || {};
    
    this.options.facebook_graph_server_host = this.options.facebook_graph_server_host || 'graph.facebook.com';
    this.options.facebook_graph_server_port = this.options.facebook_graph_server_port || '80';
    this.options.facebook_graph_secure_server_port = this.options.facebook_graph_secure_server_port || '443';
    this.options.facebook_graph_secure_server_host = this.options.facebook_graph_secure_server_host || 'graph.facebook.com';
    
    this.options.facebook_server_host = this.options.facebook_server_host || 'api.facebook.com';
    this.options.facebook_server_port = this.options.facebook_server_port || '443';
    this.options.facebook_server_path = this.options.facebook_server_path || '/method/';

    var doRestCall = function(method, params, access_token) {
        var request_path_array = [self.options.facebook_server_path, method, '?'];
        
        params = params || {};
        params['access_token'] = access_token;
        params['format'] = "json-strings";

        var is_first = true;
        for (var key in params) {
            if (is_first) {
                is_first = false;
            } else {
                request_path_array.push('&');
            }
            if (typeof params[key] === 'object') {
                params[key] = JSON.stringify(params[key]);
            }
            request_path_array.push(encodeURIComponent(key));
            request_path_array.push("=");
            request_path_array.push(encodeURIComponent(params[key]));
        }

        return doRawJsonRequest(self.options.facebook_server_host, self.options.facebook_server_port, request_path_array.join(''), true);
    };
    
    this.restCall = function(method, params, access_token) {
        return doRestCall(method, params, access_token);
    };
    
    this.graphCall = function(path, params, method) {
        /*
         * Default to take HTTP because it's faster.
         */
        var host = self.options.facebook_graph_server_host;
        var port = self.options.facebook_graph_server_port;
        var secure = false;
        var data = null;
        
        if (params.access_token) { // We have to do a secure request, because the access_token is given. This is HTTPS.
            host = self.options.facebook_graph_secure_server_host;
            port = self.options.facebook_graph_secure_server_port;
            secure = true;
        }
        
        if (method == 'POST') {
            data = params;
        } else {
            path = path + '?' + querystring.stringify(params);
        }
        return doRawJsonRequest(host, port, path, secure, method, data);
    };
    
    this.getAccessTokenFromCode = function(code, redirect_uri) {
        var access_params = {
                "client_id": app_id,
                "client_secret": app_secret,
				"code": code,
				"redirect_uri": redirect_uri
        };

        return function(cb) {
            doRawQueryRequest(self.options.facebook_graph_secure_server_host, self.options.facebook_graph_secure_server_port, "/oauth/access_token" + '?' +  querystring.stringify(access_params), true)(function(response) {
                cb(response.access_token, response.expires);
            });
        };
    };

	// parse data out of signed request
	function parseSignedRequest(signed_request) {
		var sigs = signed_request.split('.', 2);
		if (!sigs)
			return null;
		var encoded_sig = sigs[0], payload = sigs[1];
		var sig = (new Buffer(encoded_sig.replace(/\-/g, '+').replace(/\_/g, '/'), 'base64')).toString('hex');
		var data = JSON.parse((new Buffer(payload.replace(/\-/g, '+').replace(/\_/g, '/'), 'base64')).toString('utf8'));
		if (!data['algorithm'] || data['algorithm'].toUpperCase() != 'HMAC-SHA256')
			return null;
		var hmac = crypto.createHmac('sha256', app_secret);
		hmac.update(payload);
		var expected_sig = hmac.digest('hex');
		if (sig != expected_sig)
			return null;
		return data;
	}

	this.getSessionByAccessToken = function(access_token, user_id) {
		return function(cb) {
			var session = new FacebookSession(self, access_token, user_id);
			cb(session);
		};
	};

	this.getSessionByOAuthCode = function (oauth_code, redirect_uri, user_id) {
		return function (cb) {
			self.getAccessTokenFromCode(oauth_code, redirect_uri)(function (access_token, expires) {
				if (!access_token || (new Date()).getTime() < parseInt(expires, 10) * 1000) { // The token is expired.
					cb();
					return;
				}
				storeAccessTokenById(user_id, {'oauth_token': access_token, 'expires': expires});
				self.getSessionByAccessToken(access_token, user_id)(cb);
			});
		};
	}

	this.getSessionByRequestHeaders = function(requestHeaders) {
		return function(cb) {
			if (!requestHeaders['cookie']) { // We have not even cookies on this request!
				cb();
				return;
			}
			var cookie = connect.utils.parseCookie(requestHeaders['cookie']);

			var signed_request = cookie['fbsr_' + app_id];
			if (!signed_request) { // There is no such thing as a fbsr_ cookie in the request.
				cb();
				return;
			}

			var facebook_cookie = parseSignedRequest(signed_request);
			if (!facebook_cookie) { // The cookie cannot be parsed.
				cb();
				return;
			}

			if (facebook_cookie['user_id']) {
				var access_token = getAccessTokenById(facebook_cookie['user_id']);
				if (access_token) {
					facebook_cookie['oauth_token'] = access_token['oauth_token'];
					facebook_cookie['expires'] = access_token['expires'];
				}
			}

			if (facebook_cookie['oauth_token']) {
				var now = (new Date()).getTime();
				var expires_time = parseInt(facebook_cookie['expires'], 10) * 1000;
				if (now < expires_time) { // The token is expired.
					cb();
					return;
				}
				storeAccessTokenById(facebook_cookie['user_id'], facebook_cookie);
				self.getSessionByAccessToken(facebook_cookie['oauth_token'], facebook_cookie['user_id'])(cb);
			} else if (facebook_cookie['code']) {
				self.getSessionByOAuthCode(facebook_cookie['code'], '', facebook_cookie['user_id'])(cb);
			} else { // no way to get access token, abort
				cb();
				return;
			}

		};
	};
};


exports.FacebookClient = FacebookClient;
