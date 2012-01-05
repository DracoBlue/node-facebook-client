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
var https = require("https");
var querystring = require("querystring");
var crypto = require("crypto");

var FacebookSession = require("./FacebookSession").FacebookSession;
var FacebookToolkit = require("./FacebookToolkit");

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

var FacebookClient = function(api_key, api_secret, options) {
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
        params['format'] = "json";

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
        console.log(request_path_array.join(''));
        
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
        
        if (params.access_token) {
            /*
             * We have to do a secure request, because the access_token is given. This is HTTPS.
             */
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
    
    this.signaturePayload = function(payload) {
        var hmac = crypto.createHmac('sha256', api_secret);
        hmac.update(payload);
        return hmac.digest('hex');
    };
    
};

FacebookClient.prototype.getSessionByAccessToken = function(access_token) {
    var self = this;
    return function(cb) {
        var session = new FacebookSession(self, access_token);
        cb(session);
    };
};

FacebookClient.prototype.getSessionByOauthCode = function(oauth_code) {
    var self = this;
    return function(cb) {
        var session = new FacebookSession(self, null, oauth_code);
        cb(session);
    };
};

FacebookClient.prototype.getSessionByFbsCookie = function(fbs_cookie) {
    var self = this;
    
    return function(cb) {
        var facebook_cookie = querystring.parse(fbs_cookie);;
        
        if (!facebook_cookie)
        {
            /*
             * The cookie cannot be parsed.
             */
            cb();
            return ;
        }
        
        if (!facebook_cookie['access_token'] || !facebook_cookie['expires']) {
            /*
             * We don't have an access_token nor expires, this won't work.
             */
            cb();
            return ;
        }

        var now = new Date();
        var expires_time = parseInt(facebook_cookie['expires'], 10) * 1000;

        if (now.getTime() < expires_time)
        {
            /*
             * The token is expired.
             */
            cb();
            return ;
        }

        self.getSessionByAccessToken(facebook_cookie['access_token'])(cb);
    };
};

FacebookClient.prototype.getSessionByFbsrCookie = function(fbsr_cookie) {
    var self = this;
    
    return function(cb) {
        var facebook_cookie = null;
        var fbsr_cookie_parts = fbsr_cookie.split('.');
        var signature = new Buffer(fbsr_cookie_parts[0].replace(/\-/g, '+').replace(/\_/g, '/'), 'base64').toString('hex');
        var payload = fbsr_cookie_parts[1];
        var facebook_cookie_raw_json = new Buffer(payload.replace(/\-/g, '+').replace(/\_/g, '/'), 'base64').toString('binary');
        
        try
        {
            facebook_cookie = JSON.parse(facebook_cookie_raw_json);
        }
        catch (error)
        {
            /*
             * Invalid json :(
             */
            facebook_cookie = null;
        }
        

        if (!facebook_cookie)
        {
            /*
             * The cookie cannot be parsed.
             */
            cb();
            return ;
        }
        
        if (!facebook_cookie['algorithm'] || !facebook_cookie['code'] || !facebook_cookie['issued_at']) {
            /*
             * We don't have an algorithm, code or issued_at, this won't work.
             */
            cb();
            return ;
        }
        
        if (facebook_cookie['algorithm'].toUpperCase() != 'HMAC-SHA256')
        {
            /*
             * We cannot support any other alogrithm at the moment (actually
             * this is the only one facebook supports right now).
             */
            cb();
            return ;
        }
    
        var expected_signature = self.signaturePayload(payload);
            
        if (expected_signature !== signature)
        {
            /*
             * The signature was wrong.
             */
            cb();
            return ;
        }

        self.getSessionByOauthCode(facebook_cookie['code'])(cb);
    };
};

FacebookClient.prototype.getSessionByRequestHeaders = function(request_headers) {
    var self = this;
    
    return function(cb) {
        if (!request_headers['cookie'])
        {
            /*
             * We have not even cookies on this request!
             */
            cb();
            return
        }
        
        var facebook_cookie_raw = request_headers["cookie"].match(/fbs_[\d]+\=\"([^; ]+)\"/);
        if (facebook_cookie_raw)
        {
            self.getSessionByFbsCookie(facebook_cookie_raw[1])(cb);
            return ;
        }
        
        facebook_cookie_raw = request_headers["cookie"].match(/fbsr_[\d]+\=([^; ]+)/);
        
        if (facebook_cookie_raw)
        {
            self.getSessionByFbsrCookie(facebook_cookie_raw[1])(cb);
            return ;
        }
        
        /*
         * There is no such thing as a fbs_ or fbsr_ cookie in the request.
         */
        
        cb();
    };
};

exports.FacebookClient = FacebookClient;
