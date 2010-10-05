/*
 * This file is part of node-facebook-client
 *
 * Copyright (c) 2010 DracoBlue, http://dracoblue.net/
 *
 * Licensed under the terms of MIT License. For the full copyright and license
 * information, please see the LICENSE file in the root folder.
 */

var FacebookSession = function(facebook_client, session_key) {
    var self = this;

    this.facebook_client = facebook_client;
    
    if (session_key) {
        this.has_session_key = true;
    } else {
        this.has_session_key = false;
    }
    
    this.has_access_token = false;
    
    this.restCall = function(method, params) {
        var authed_params = {
            "session_key": session_key
        };
        
        for (var key in params) {
            authed_params[key] = params[key];
        }
        
        return facebook_client.restCall(method, authed_params);
    };
    
    
    this.getAccessToken = function(options) {
        return facebook_client.getAccessToken(options);
    };
        
};

FacebookSession.prototype.getId = function() {
    var self = this;
    
    return function(cb) {
        if (self.has_access_token) {
            self.graphCall("/me")(function(user_data){
                cb(user_data.id);
            });
        } else if (self.has_session_key) {
            self.restCall("users.getLoggedInUser", {
            })(function(ret_val) {
                cb(ret_val);
            });
        } else {
            cb();
        }
    }
}

FacebookSession.prototype.getMeta = function() {
    var self = this;
    
    return function(cb) {
        if (self.has_access_token) {
            self.graphCall("/me")(function(user_data){
                cb(user_data);
            });
        } else if (self.has_session_key) {
            throw new Error('getMeta is not yet implemented, if you don\'t have an access_token.');
        } else {
            cb();
        }
    }
};

FacebookSession.prototype.retrieveAccessToken = function(code, redirect_uri) {
    var self = this;
    
    return function(cb) {
        self.getAccessToken({
            redirect_uri: redirect_uri,
            code: code
        })(function(access_token, expire_time) {
            self.graphCall = function(path, params) {
                var authed_params = {
                    "access_token": access_token
                };
                
                for (var key in params) {
                    authed_params[key] = params[key];
                }
                
                return self.facebook_client.graphCall(path, authed_params);
            };

            self.has_access_token = true;
            
            cb();
        });
    }
};

FacebookSession.prototype.injectAccessToken = function(access_token) {
    var self = this;
    
    return function(cb) {
        self.graphCall = function(path, params) {
            var authed_params = {
                "access_token": access_token
            };
            
            for (var key in params) {
                authed_params[key] = params[key];
            }
            
            return self.facebook_client.graphCall(path, authed_params);
        };

        self.has_access_token = true;
        
        cb();
    }
};

exports.FacebookSession = FacebookSession;