node-facebook-client README
===========================

Version: 1.6.0

Official Site: <http://dracoblue.net/>

node-facebook-client is copyright 2010-2012 by DracoBlue <http://dracoblue.net>

What is node-facebook-client?
-----------------------------
The node-facebook-client library is a set of nodejs classes to communicate
with the rest and graph api provided by facebook.

It works great if you embed the facebook connect button on your page and
want to use the rest + graph api by facebook. Oauth-support may work but
is not tested that well.

The library is not officially created nor maintained by facebook. It is
created by dracoblue and licensed under the terms of MIT License.

## Example

This small example uses the FacebookClient class to retrieve the name of a
user. requst.headers are the headers from the server request.

    var FacebookClient = require("facebook-client").FacebookClient;
    
    var facebook_client = new FacebookClient(
        "yourappid", // configure like your fb app page states
        "yourappsecret", // configure like your fb app page states
        {
            "timeout": 10000 // modify the global timeout for facebook calls (Default: 10000)
        }
    );
    
    facebook_client.getSessionByRequestHeaders(request.headers)(function(facebook_session) {
        facebook_session.graphCall("/me", {
        })(function(result) {
            console.log('Username is:' + result.name);
        });
        facebook_session.graphCall("/me/feed", {message:"I love node.js!"}, 'POST')(function(result) {
            console.log('The new feed post id is: ' + result.id);
        });
    });
    
A full example may be executed with: `node run_example.js`. Please configure `yourappid`+`yourappsecret` in that file first.

## Graph API

### FacebookClient#graphCall(path, params[, method, options])

Doing a call against the graph server.

    client.graphCall(path, params, method)(function(result) {
        // 
    });

The parameter `method` can be omitted and is 'GET' in this case. You may use
`options.timeout = 5000` to modify the timeout until the request will be
canceled. 

## Rest API

### FacebookSession#restCall(method, params, access_token[, options])

Doing a signed call against the rest api server, by using the session of the
user.

    session.restCall("users.getInfo", {
        fields: "name",
        uids: session.uid
    })(function(response_users) {
        // work with it
    });

You may use `options.timeout = 5000` to modify the timeout until the request
will be canceled. 

## General API

### FacebookClient#getSessionByRequestHeaders(request_headers)

Use the request headers to retrieve the session.

    facebook_client.getSessionByRequestHeaders(request.headers)(function(facebook_session) {
        // session is either undefined or a valid FacebookSession
    });

### FacebookSession#isValid()

Calls `/me` on the graph api, to check whether the session is still valid or the
user has already logged out.

    session.isValid()(function(is_valid) {
        // is either true or false
    });

Remember to do that only when necessary and not on every request.

### FacebookClient#getSessionByAccessToken(access_token)

Creating a new FacebookSession instance with a given access_token.

### FacebookSession#getId()

Retrieving the id of the session.

    session.getId()(function(id) {
        // is either a string or undefined, in case the session has no id
    });

### FacebookSession#getMeta()

Tries to retrieve all data from the graph call /me for the user.

    session.getMeta()(function(user_data) {
        // work with it
    });

## Internal API

### FacebookClient#getAccessToken(access_params)

Retrieving an AccessToken with the given parameters. You don't need to use this
function if you used `FacebookClient#getSessionByRequestHeaders`.

    client.getAccessToken(access_params)(function(access_token, expires) {
        // 
    });
    
### FacebookSession#retrieveAccessToken(code, redirect_uri)

Retrieve an access token by providing a code and a redirect_uri. Usually from
successful oauth redirect.

### FacebookSession#injectAccessToken(access_token)

Used to inject an access_token into an existing FacebookSession. This will enable
calls like `FacebookSession#restCall` and `FacebookSession#graphCall` to work
authenticated. It is triggered by `FacebookClient#getSessionByRequestHeaders`
after successful creation of the session.

### FacebookSession#getAccessToken(access_params)

Retrieving an AccessToken with the given parameters and injecting it into the
FacebookSession.

### FacebookToolkit.generateSignature(params, api_secret)

Calculates the signature for a given set of parameters and the api_secret.

Changelog
---------

- 1.6.0 (2012/01/22)
  - rewrote requests from multiple parameters to options-object
  - added `options.timeout` for `restCall` and `graphCall` #22
  - fixed error handling in case the timeout is reached #22
- 1.5.3 (2012/01/22)
  - fixed issue with graphCall and method parameter #21
- 1.5.2 (2012/01/07)
  - added multiquery-support for graphCall #12
- 1.5.1 (2012/01/06)
  - fixed isValid: throwed an exception, when user_data.error was not existant
  - added backward compatibility for node 0.4.x, if toString('hex') was missing
- 1.5.0 (2012/01/05)
  - added support for fbsr-cookie from new facebook auth #16
  - added support for lazy-access-token retrieval if oauth-code is given
  - added timeout of 10 seconds for each call against facebook #15
- 1.4.0 (2011/10/06)
  - added multiquery-support. #12
- 1.3.0 (2011/04/26)
  - added FacebookSession#isValid
  - fixed expires validation fixes #5
  - added method argument to session.graphCall to permit POSTing in addition to GETting
- 1.2.0 (2011/03/09)
  - added support for node 0.4
- 1.1.0 (2010/12/29)
  - removed session_key support
  - added example
- 1.0.1 (2010/12/29)
  - added secure url for access_token
- 1.0.0 (2010/10/05)
  - Initial release

Contributors
------------

- DracoBlue http://dracoblue.net
- jharlap https://github.com/jharlap
- liuliu https://github.com/liuliu
- kaareal https://github.com/kaareal
- leoasis https://github.com/leoasis

License
--------

node-facebook-client is licensed under the terms of MIT. See LICENSE for more information.
