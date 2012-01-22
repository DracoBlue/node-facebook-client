/*
 * This file is part of node-facebook-client
 *
 * Copyright (c) 2010 DracoBlue, http://dracoblue.net/
 *
 * Licensed under the terms of MIT License. For the full copyright and license
 * information, please see the LICENSE file in the root folder.
 */

var FacebookSession = function(facebook_client, access_token, oauth_code) {
    var self = this;

    this.facebook_client = facebook_client;
    this.oauth_code = oauth_code || null;
    
    this.graphCall = function(path, params, method, options) {
        return function(cb) {
            self.retrieveAccessToken(self.oauth_code, '')(function(access_token) {
                if (!access_token) {
                    cb();
                    return ;
                }
                
                self.graphCall(path, params, method, options)(cb);
            });
        };
    };

    this.restCall = function(method, params, options) {
        return function(cb) {
            self.retrieveAccessToken(self.oauth_code, '')(function(access_token) {
                if (!access_token) {
                    cb();
                    return ;
                }
                
                self.restCall(method, params, access_token, options)(cb);
            });
        };
    };
    
    if (access_token) {
        this.rawInjectAccessToken(access_token);
    }
    
    this.getAccessToken = function(options) {
        return facebook_client.getAccessToken(options);
    };
};

FacebookSession.prototype.getId = function() {
    var self = this;
    
    return function(cb) {
        self.graphCall("/me")(function(user_data){
            cb(user_data.id);
        });
    };
};

FacebookSession.prototype.isValid = function() {
    var self = this;
    
    return function(cb) {
        self.graphCall("/me")(function(user_data){
            if (!user_data || user_data.error)
            {
                cb(false);
            }
            else
            {
                cb(true);
            }
        });
    };
};


FacebookSession.prototype.getMeta = function() {
    var self = this;
    
    return function(cb) {
        self.graphCall("/me")(function(user_data){
            cb(user_data);
        });
    }
};

FacebookSession.prototype.retrieveAccessToken = function(code, redirect_uri) {
    var self = this;
    
    return function(cb) {
        self.getAccessToken({
            redirect_uri: redirect_uri,
            code: code
        })(function(access_token, expire_time) {
            
            if (!access_token) {
                cb();
                return ;
            }
            
            self.injectAccessToken(access_token)(function() {
                cb(access_token);
            });
        });
    };
};

FacebookSession.prototype.injectAccessToken = function(access_token) {
    var self = this;
    
    return function(cb) {
        self.rawInjectAccessToken(access_token);
        cb();
    };
};

FacebookSession.prototype.rawInjectAccessToken = function(access_token) {
    var self = this;
    
    self.graphCall = function(path, params, method, options) {
        var authed_params = {
            "access_token": access_token
        };
        
        for (var key in params) {
            authed_params[key] = params[key];
        }
        
        return self.facebook_client.graphCall(path, authed_params, method, options);
    };
    
    self.restCall = function(method, params, options) {
        return self.facebook_client.restCall(method, params, access_token, options);
    };
};

exports.FacebookSession = FacebookSession;
