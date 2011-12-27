/*
 * This file is part of node-facebook-client
 *
 * Copyright (c) 2010 DracoBlue, http://dracoblue.net/
 *
 * Licensed under the terms of MIT License. For the full copyright and license
 * information, please see the LICENSE file in the root folder.
 */

var FacebookSession = function(facebook_client, access_token, user_id) {
    var self = this;

    if (access_token) {
        var graphCall = function(path, params, method) {
            method = method || 'GET';
            var authed_params = {
                "access_token": access_token
            };
            
            for (var key in params) {
                authed_params[key] = params[key];
            }
            return facebook_client.graphCall(path, authed_params, method);
        };

        var restCall = function(method, params) {
            return facebook_client.restCall(method, params, access_token);
        };

		this.api = function (path, params, method) {
			if (typeof path == "object") { // is rest api call
				return restCall(path['method'], path);
			} else if (typeof path == "string") {
				return graphCall(path, params, method);
			}
		}
        
        this.has_access_token = true;
    } else {
		this.api = function (path, params, method) {
			if (typeof path == "object") { // is rest api call
				return facebook_client.restCall(path['method'], path);
			} else if (typeof path == "string") {
				return facebook_client.graphCall(path, params, method);
			}
		}

		this.has_access_token = false;
	}

    this.getAccessToken = function(options) {
        return facebook_client.getAccessToken(options);
    };

	this.getId = function() {
		return function(cb) {
			if (self.has_access_token) {
				if (user_id) {
					cb(user_id);
				} else {
					self.api("/me")(function(user_data){
						user_id = user_data.id;
						cb(user_data.id);
					});
				}
			} else {
				cb();
			}
		}
	}
};

FacebookSession.prototype.isValid = function() {
    var self = this;
    return function(cb) {
        if (self.has_access_token) {
            self.api("/me")(function(user_data){
                if (user_data.error)
                    cb(false);
                else
                    cb(true);
            });
        } else {
            cb(false);
        }
    }
}


FacebookSession.prototype.getUser = function() {
    var self = this;
    return function(cb) {
        if (self.has_access_token) {
            self.api("/me")(function(user_data){
                cb(user_data);
            });
        } else {
            cb();
        }
    }
};

exports.FacebookSession = FacebookSession;
