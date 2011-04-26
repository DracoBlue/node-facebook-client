/*
 * This file is part of node-facebook-client
 *
 * Copyright (c) 2010 DracoBlue, http://dracoblue.net/
 *
 * Licensed under the terms of MIT License. For the full copyright and license
 * information, please see the LICENSE file in the root folder.
 */

var FacebookSession = function(facebook_client, access_token) {
    var self = this;

    this.facebook_client = facebook_client;
    
    this.has_access_token = false;
    
    if (access_token)
    {
        self.graphCall = function(path, params, method) {
            method = method || 'GET';
            var authed_params = {
                "access_token": access_token
            };
            
            for (var key in params) {
                authed_params[key] = params[key];
            }
            
            return self.facebook_client.graphCall(path, authed_params, method);
        };

        this.restCall = function(method, params) {
            return facebook_client.restCall(method, params, access_token);
        };
        
        self.has_access_token = true;
    }
    
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
        } else {
            cb();
        }
    }
}

FacebookSession.prototype.isValid = function() {
    var self = this;
    
    return function(cb) {
        if (self.has_access_token) {
            self.graphCall("/me")(function(user_data){
                if (user_data.error)
                {
                    cb(false);
                }
                else
                {
                    cb(true);
                }
            });
        } else {
            cb(false);
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
            self.injectAccessToken(access_token)(function() {
                cb();
            });
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
        
        self.restCall = function(method, params) {
            return facebook_client.restCall(method, params, access_token);
        };

        self.has_access_token = true;
        
        cb();
    };
};

exports.FacebookSession = FacebookSession;
