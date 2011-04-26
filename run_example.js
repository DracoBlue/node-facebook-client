var http = require('http');
var FacebookClient = require("facebook-client").FacebookClient;

http.createServer(function (request, response) {
    var app_id = "yourappid"; // configure like your fb app page states
    
    var facebook_client = new FacebookClient(
        app_id,
        "yourappsecret" // configure like your fb app page states
    );

    facebook_client.getSessionByRequestHeaders(request.headers)(function(facebook_session) {
        if (!facebook_session)
        {
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write([
                '<html>',
                '<head><title>node-facebook-client example</title></head><body>',
                '<p>Login please</p> <fb:login-button autologoutlink="true"></fb:login-button>',
                '<div id="fb-root"></div>',
                '<script type="text/javascript">',
                  'window.fbAsyncInit = function() {',

                  '    FB.init({appId: "' + app_id +'", logging:false, status: true, cookie: true, xfbml: true});',
                  '    FB.Event.subscribe(\'auth.sessionChange\', function(response) {',
                  '        document.location = document.location.href;',
                  '    });',
                  '};',
                  '(function() {',
                  '  var e = document.createElement(\'script\'); e.async = true;',
                  '  e.src = document.location.protocol +',
                  '    \'//connect.facebook.net/en_US/all.js\';',
                  '  document.getElementById(\'fb-root\').appendChild(e);',
                  '}());',
                  '</script>',
                  '</body>',
                  '</html>'
            ].join("\n"));
            response.end();
            return ;
        }
        
        /*
         * Graph-API
         */
        response.writeHead(200, {'Content-Type': 'text/plain'});
        facebook_session.isValid()(function(is_valid) {
            if (!is_valid)
            {
                response.write('Session expired or user logged out.' + "\n");
                response.end();
                return ;
            }    
            facebook_session.graphCall("/me", {
            })(function(result) {
                response.write('By using Graph API:' + "\n");
                response.write('  Name:' + result.name + "\n");
                response.write('  Link:' + result.link + "\n");
                response.end();
            });    
        });
    });   
    
}).listen(8000);
