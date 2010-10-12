/*
 * This file is part of node-facebook-client
 *
 * Copyright (c) 2010 DracoBlue, http://dracoblue.net/
 *
 * Licensed under the terms of MIT License. For the full copyright and license
 * information, please see the LICENSE file in the root folder.
 */

var sys = require("sys"),
    http = require("http"),
    querystring = require("querystring"),
    FacebookSession = require("./FacebookSession").FacebookSession,
    FacebookToolkit = require("./FacebookToolkit"),

    doRawJsonRequest = function (host, port, path) {
      return function (cb) {
        var connection = http.createClient(port, host),
        request = connection.request('GET', path, {'host': host});

        request.addListener('response', function (response) {
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


var FacebookClient = function (api_key, api_secret, options) {
  var self = this,
      doRestCall = function (method, params, calculate_signature) {
        var request_params = {
          "method": method,
          "v": "1.0",
          "format": "json",
          "api_key": api_key
        },
        request_path_array = [self.options.facebook_server_path, '?'],
        is_first = true,
        key = null;

        for (key in params) {
          request_params[key] = params[key];
        }

        for (key in request_params) {
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
          request_path_array.push(encodeURIComponent(FacebookToolkit.generateSignature(request_params, api_secret)));
        }

        return doRawJsonRequest(self.options.facebook_server_host, self.options.facebook_server_port, request_path_array.join(''));
      };

  this.options = options || {};

  this.options.facebook_graph_server_host = this.options.facebook_graph_server_host || 'graph.facebook.com';
  this.options.facebook_graph_server_port = this.options.facebook_graph_server_port || '80';

  this.options.facebook_server_host = this.options.facebook_server_host || 'api.facebook.com';
  this.options.facebook_server_port = this.options.facebook_server_port || '80';
  this.options.facebook_server_path = this.options.facebook_server_path || '/restserver.php';

  this.restCallUnsigned = function (method, params) {
    return doRestCall(method, params, false);
  };

  this.restCall = function (method, params) {
    return doRestCall(method, params, true);
  };

  this.graphCall = function (path, params) {
    return doRawJsonRequest(self.options.facebook_graph_server_host, self.options.facebook_graph_server_port, path + '?' + querystring.stringify(params));
  };

  this.getAccessToken = function (options, callback) {

    var OAuth = require("oauth").OAuth2,
        oAuth = new OAuth(api_key, api_secret, "https://graph.facebook.com");

    options = options || {};

    oAuth.getOAuthAccessToken(
      options.code,
      {redirect_uri: options.redirect_uri, scope: options.scope},
      function (error, access_token, refresh_token) {
        if (error) {
          callback(error, null);
        } else {
          callback(null, {access_token: access_token, refresh_token: refresh_token});
        }
      }
    );
  };

};

FacebookClient.prototype.getSessionByKey = function (session_key) {
  var self = this;
  return function (cb) {
    cb(new FacebookSession(self, session_key));
  };
};

FacebookClient.prototype.getSessionByAccessToken = function (access_token) {
  var self = this;
  return function (cb) {
    var session = new FacebookSession(self);
    session.injectAccessToken(access_token)(function () {
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

module.exports.FacebookClient = FacebookClient;
