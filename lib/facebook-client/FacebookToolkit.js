/*
 * This file is part of node-facebook-client
 *
 * Copyright (c) 2010 DracoBlue, http://dracoblue.net/
 *
 * Licensed under the terms of MIT License. For the full copyright and license
 * information, please see the LICENSE file in the root folder.
 */

var crypto = require("crypto");

exports.generateSignature = function(args, api_secret) {
    var keys_and_values = [];
    
    for (var key in args) {
        keys_and_values.push({
          "key": key,
          "val": args[key]
        });
    }

    /*
        * Sort by key first, then value
        */
    keys_and_values.sort(function(a,b) {
        if (a.key < b.key) {
            return -1
        } else if (a.key > b.key) {
            return 1
        } else {
            return 0
        }
    });

    /*
     * Now combine key and value into key=value
     */
    var query_string_except_signature = [];
    var keys_and_values_length = keys_and_values.length;
    for (var position=0; position<keys_and_values_length; position++) {
        query_string_except_signature.push(keys_and_values[position].key);
        query_string_except_signature.push("=")
        query_string_except_signature.push(keys_and_values[position].val);
    }

    var hash = crypto.createHash('md5');
    hash.update(query_string_except_signature.join('') + api_secret);
    return hash.digest('hex');
};