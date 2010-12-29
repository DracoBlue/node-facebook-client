/*
 * This file is part of node-facebook-client
 *
 * Copyright (c) 2010 DracoBlue, http://dracoblue.net/
 *
 * Licensed under the terms of MIT License. For the full copyright and license
 * information, please see the LICENSE file in the root folder.
 */

var sys = require("sys");
var http = require("http");
var querystring = require("querystring");

var FacebookSession = require("./FacebookSession").FacebookSession;
var FacebookToolkit = require("./FacebookToolkit");

function doRawJsonRequest(host, port, path, secure) {
    return function(cb) {
        var connection = http.createClient(port, host, secure);
        var request = connection.request('GET', path, {'host': host});
        
        request.addListener('response', function(response){
            response.setEncoding("utf8");

            var body = [];

            response.addListener("data", function (chunk) {
                body.push(chunk);
            });

            response.addListener("end", function () {
                cb(JSON.parse(body.join("")));
            });
        });

        request.end();
    };
};


function doRawQueryRequest(host, port, path, secure) {
    return function(cb) {
        var connection = http.createClient(port, host, secure);
        var request = connection.request('GET', path, {'host': host});
        
        request.addListener('response', function(response){
            response.setBodyEncoding("utf8");

            var body = [];

            response.addListener("data", function (chunk) {
                body.push(chunk);
            });

            response.addListener("end", function () {
                cb(querystring.parse(body.join("")));
            });
        });

        request.end();
    };
}

var FacebookClient = function(api_key, api_secret, options) {
    var self = this;

    this.options = options || {};
    
    this.options.facebook_graph_server_host = this.options.facebook_graph_server_host || 'graph.facebook.com';
    this.options.facebook_graph_server_port = this.options.facebook_graph_server_port || '80';
    this.options.facebook_graph_server_port = this.options.facebook_graph_secure_server_port || '443';
    this.options.facebook_graph_server_host = this.options.facebook_graph_secure_server_host || 'graph.facebook.com';
    
    this.options.facebook_server_host = this.options.facebook_server_host || 'api.facebook.com';
    this.options.facebook_server_port = this.options.facebook_server_port || '80';
    this.options.facebook_server_path = this.options.facebook_server_path || '/restserver.php';

    var doRestCall = function(method, params, calculate_signature) {
        var request_params = {
            "method": method,
            "v": "1.0",
            "format": "json",
            "api_key": api_key
        };
        
        for (var key in params) {
            request_params[key] = params[key];
        }

        var request_path_array = [self.options.facebook_server_path, '?'];

        var is_first = true;
        for (var key in request_params) {
            if (is_first) {
                is_first = false;
            } else {
                request_path_array.push('&');
            }
            request_path_array.push(encodeURIComponent(key));
            request_path_array.push("=");
            request_path_array.push(encodeURIComponent(request_params[key]));
        }

        if (calculate_signature) {
            request_path_array.push("&sig=");
            request_path_array.push(encodeURIComponent(FacebookToolkit.generateSignature(request_params,api_secret)));
        }

        return doRawJsonRequest(self.options.facebook_server_host, self.options.facebook_server_port, request_path_array.join(''));
    };
    
    this.restCallUnsigned = function(method, params) {
        return doRestCall(method, params, false);
    };

    this.restCall = function(method, params) {
        return doRestCall(method, params, true);
    };
    
    this.graphCall = function(path, params) {
        if (params.access_token) {
            /*
             * We have to do a secure request, because the access_token is given. This is HTTPS.
             */
            return doRawJsonRequest(self.options.facebook_graph_secure_server_host, self.options.facebook_graph_secure_server_port, path + '?' + querystring.stringify(params), true);
        }
        /*
         * No access token given, let's take HTTP because it's faster.
         */
        return doRawJsonRequest(self.options.facebook_graph_server_host, self.options.facebook_graph_server_port, path + '?' + querystring.stringify(params), false);
    };
    
    this.getAccessToken = function(params) {
        var access_params = {
                client_id: api_key,
                client_secret: api_secret
        };
        
        for (var key in params) {
            access_params[key] = params[key];
        }

        return function(cb) {
            doRawQueryRequest(self.options.facebook_graph_secure_server_host, self.options.facebook_graph_secure_server_port, "/oauth/access_token" + '?' +  querystring.stringify(access_params), true)(function(response) {
                cb(response.access_token, response.expires);
            });
        };
    };
    
};

FacebookClient.prototype.getSessionByKey = function(session_key) {
    var self = this;
    return function(cb) {
        cb(new FacebookSession(self, session_key));
    };
};

FacebookClient.prototype.getSessionByAccessToken = function(access_token) {
    var self = this;
    return function(cb) {
        var session = new FacebookSession(self);
        session.injectAccessToken(access_token)(function() {
            cb(session);
        });
    };
};

// TODO: Let's see if we still need this.
//FacebookClient.prototype.getSessionByCodeAndRedirectUri = function(code, redirect_uri) {
//    var self = this;
//    return function(cb) {
//        var session = new FacebookSession(self);
//        session.retrieveAccessToken(code, redirect_uri)(function() {
//            cb(session);
//        });
//    };
//};

exports.FacebookClient = FacebookClient;
