node-facebook-client README
===========================

Version: 1.0.1

Official Site: <http://dracoblue.net/>

node-facebook-client is copyright 2010 by DracoBlue <http://dracoblue.net>

What is node-facebook-client?
-----------------------------
The node-facebook-client library is a set of nodejs classes to communicate
with the rest and graph api provided by facebook.

The library is not officially created nor maintained by facebook. It is
created by dracoblue and licensed under the terms of MIT License.

## Example

This small example uses the FacebookClient class to retrieve the name of a user.

    // Input: session_key : the session_key, taken from fb cookies)
    //        user_id     : facebook id of a user for users.getInfo
    
    var FacebookClient = require("facebook-client").FacebookClient;

    var facebook_client = new FacebookClient(
        "yourappid",    // configure like your fb app page states
        "yourappsecret" // configure like your fb app page states
    );
    
    facebook_client.getSessionByKey(session_key)(function(facebook_session) {
        facebook_session.restCall("users.getInfo", {
            fields: "name",
            uids: user_id
        })(function(response_users) {
            if (response_users.error_code) {
                // User does not exist :(
            } else {
                // We got the data!
                console.log('Hi ' + response_users[0].name + '!');
            }
        });    
    });    
    

## Graph API

### FacebookClient#graphCall(path, params)

Doing a call against the graph server.

    client.graphCall(path, params)(function(access_token, expires) {
        // 
    });

## Rest API

### FacebookClient#restCall(method, params)

Doing a signed call against the rest api server.

### FacebookSession#restCall(method, params)

Doing a signed call against the rest api server, by using the session of the
user.

    session.restCall("users.getInfo", {
        fields: "name",
        uids: session.uid
    })(function(response_users) {
        // work with it
    });

### FacebookClient#restCallUnsigned(method, params)

Doing an unsigned call against the rest api server.

## General API

### FacebookClient#getSessionByKey(session_key)

Creating a new FacebookSession instance with the given session_key.

    client.getSessionByKey(session.session_key)(function(session) {
        // work with the key,
        session.restCall("users.getInfo", {
            fields: "name",
            uids: session.uid
        })(function(response_users) {
            // yay, we got it's name: response_users[0].name!
        });
    });
    
### FacebookClient#getSessionByAccessToken(access_token)

Creating a new FacebookSession instance with a given access_token.
    
### FacebookSession#getId()

Retrieving the id of the session.

    session.getId()(function(id) {
        // is either a string or undefined, in case the session has no id
    });

### FacebookSession#getMeta()

Tries to retrieve all data from the graph call /me for the user. This is
_only_ available in case of a session, which got initialized by an access_token.

    session.getMeta()(function(user_data) {
        // work with it
    });

## Internal API

### FacebookClient#getAccessToken(access_params)

Retrieving an AccessToken with the given parameters.

    client.getAccessToken(access_params)(function(access_token, expires) {
        // 
    });
    
### FacebookSession#retrieveAccessToken(code, redirect_uri)

Retrieve an access token by providing a code and a redirect_uri. Usually from
successful oauth redirect.

### FacebookSession#injectAccessToken(access_token)

Used to inject an access_token into an existing FacebookSession.

### FacebookSession#getAccessToken(access_params)

Retrieving an AccessToken with the given parameters and injecting it into the
FacebookSession.

### FacebookToolkit.generateSignature(params, api_secret)

Calculates the signature for a given set of parameters and the api_secret.

Changelog
---------

- 1.0.1 (2010/12/29)
  - added secure url for access_token
- 1.0.0 (2010/10/05)
  - Initial release

License
--------

node-facebook-client is licensed under the terms of MIT. See LICENSE for more information.
