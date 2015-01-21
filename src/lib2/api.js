define(function (require) {

    "use strict";
    
    var $       = require('jquery'),
        _       = require('underscore'),
        Utils   = require('utils'),
        io      = require('lib2/local_socketio'),

        Api     = {

            defaults: {
                cache: false,
                type: 'POST',
                data: '',
                dataType: 'html',
                timeout: 25000,
                contentType: "application/json; charset=utf-8"
            },

            // queue: $.manageAjax.create('cacheQueue', {
            //     queue: true, 
            //     cacheResponse: false
            // }),

            search: function(queryOptions, cacheOptions){
                // Gather multiple requests in a 100ms window into a single request
                // - needs to be really quick at switching?

                var dfd = $.Deferred();

                if(App.Data.timer){
                    // already started timer
                    // - add to current bucket
                    
                    App.Data.timerBucket.push([dfd, queryOptions]);

                } else {

                    // Start timer
                    App.Data.timer = 1;
                    App.Data.timerBucket = [];

                    App.Data.timerBucket.push([dfd, queryOptions]);

                    // Start waiting period for new searchOptions
                    setTimeout(function(){
                        // Turn off timer
                        App.Data.timer = 0;

                        // Clone timer bucket
                        var searchesToRun = App.Data.timerBucket.splice(0);

                        // Create search query
                        // - iterate through each possible query
                        var searchData = {};
                        var searchQueryOptions = {
                            data: {
                                type: "multi",
                                multiple: {} // object
                            },
                            success: function(response){

                                // query has returned
                                // - parse out the deferreds according to the indexKey

                                // resolve each dfd accordingly

                                _.each(response.data, function(elemData, idx){
                                    // idx refers to the index of the searchesToRun
                                    // console.log('elemData');
                                    // console.log(elemData);

                                    // Resolve
                                    searchesToRun[idx][0].resolve(elemData);

                                    // Call success function
                                    // console.log(searchesToRun[idx]);
                                    searchesToRun[idx][1].success(elemData); // previously stringified!?

                                });

                            },
                            error: function(response){
                                // What was the error?
                                // - pass it along to responses
                                
                                _.each(searchesToRun, function(elemData){
                                    elemData[0].reject(response);
                                    if(elemData[1].error){
                                        elemData[1].error(response);
                                    }
                                });
                                

                            }
                        };
                        _.each(searchesToRun, function(search, idx){
                            // search[0] = dfd, search[1] = queryOptions

                            searchQueryOptions.data.multiple[idx] = search[1].data;
                        });

                        // Run query
                        Api.query('/api/search',searchQueryOptions);

                    }, 100);

                }

                // Return a deferred
                return dfd.promise();

                // // Normal search query
                // return Api.query('/api/search',queryOptions);

            },

            count: function(queryOptions){

                return Api.query('/api/count',queryOptions);

            },

            update: function(queryOptions){

                return Api.query('/api/update',queryOptions);

            },

            write: function(queryOptions){

                return Api.query('/api/write',queryOptions);

            },

            write_file: function(queryOptions){

                return Api.query('/api/write/file',queryOptions);

            },

            remove: function(queryOptions){

                return Api.query('/api/remove',queryOptions);

            },

            event: function(queryOptions){

                // Start listeners
                // var _return = Api.query('/api/event',queryOptions);

                // Chain to _return


                var dfd = $.Deferred();


                if(queryOptions.response){

                    // overwrite the success function with our own response function
                    queryOptions._success = queryOptions.success || null;

                    queryOptions.success = function(bodyResponse){
                        // console.log(bodyResponse);
                        var responseObj = JSON.parse(bodyResponse);
                        // console.log(JSON.stringify(bodyResponse));
                        var event_id = responseObj.data.event_id;

                        // Iterate over response listeners and create 
                        $.each(queryOptions.response,function(pkg,callback){
                            // console.info(pkg);
                            Api.Event.on({
                                event: queryOptions.data.event + ".Response"
                            },function(result){
                                // Check for package match
                                // console.info('TEST');
                                // console.log(result.type);
                                // console.log(result.data.response_to);
                                // console.log(event_id);
                                if(result.type == 'response' && result.data.response_to == event_id){

                                    // Any or specific
                                    if(result.data.app  == pkg || result.data.app  == 'any'){
                                        // Handle this response
                                        // console.error('callback');
                                        callback(result.data); // only return the result.data
                                        return;
                                    }

                                    // Not handling "all resolved"

                                }
                                
                            });

                            // Start a timeout counter
                            // - timeout is 10 seconds
                            // - don't need to do this if callbacks always return


                        });

                        // call the old success function
                        if(queryOptions._success != null){
                            console.info('called event _success');
                            console.log(bodyResponse);
                            queryOptions._success.call(this, bodyResponse, responseObj.code, responseObj.data, responseObj.msg);
                        }

                    }

                }


                if(App.Data.eventTimer){
                    // already started timer
                    // - add to current bucket
                    
                    App.Data.eventTimerBucket.push([dfd, queryOptions]);

                } else {

                    // Start timer
                    App.Data.eventTimer = 1;
                    App.Data.eventTimerBucket = [];

                    App.Data.eventTimerBucket.push([dfd, queryOptions]);

                    // Start waiting period for new searchOptions
                    setTimeout(function(){
                        // Turn off timer
                        App.Data.eventTimer = 0;

                        // Clone timer bucket
                        var queriesToRun = App.Data.eventTimerBucket.splice(0);

                        // Create search query
                        // - iterate through each possible query
                        var reqData = {};
                        var runQueryOptions = {
                            data: {
                                type: "multi",
                                multiple: {} // object
                            },
                            success: function(response){
                                // console.log(response);
                                // response = JSON.parse(response);

                                // console.log('Event response');
                                // console.log(JSON.stringify(response));

                                // query has returned
                                // - parse out the deferreds according to the indexKey

                                // resolve each dfd accordingly

                                _.each(response.data, function(elemData, idx){
                                    // idx refers to the index of the queriesToRun
                                    // console.log('elemData');
                                    // console.log(elemData);

                                    // Resolve
                                    queriesToRun[idx][0].resolve(elemData);

                                    // Call success function
                                    // console.log(queriesToRun[idx]);
                                    queriesToRun[idx][1].success(JSON.stringify(elemData));

                                });

                            },
                            error: function(response){
                                // What was the error?
                                // - pass it along to responses
                                
                                _.each(queriesToRun, function(elemData){
                                    elemData[0].reject(response);
                                    if(elemData[1].error){
                                        elemData[1].error(response);
                                    }
                                });
                                

                            }
                        };
                        _.each(queriesToRun, function(query, idx){
                            // search[0] = dfd, search[1] = queryOptions

                            runQueryOptions.data.multiple[idx] = query[1].data;
                        });

                        // Run query
                        Api.query('/api/event',runQueryOptions);

                    }, 100);

                }

                // Return a deferred
                return dfd.promise();



            },

            event_cancel: function(queryOptions){
                // Requires: event_id
                return Api.query('/api/event/cancel',queryOptions);

            },

            query: function(inputUrl,inputQueryOptions){
                // Almost the exact same as Api.search
                var url = '' + inputUrl,
                    queryOptions = $.extend({}, inputQueryOptions);

                var use_queue = false;
                if(typeof queryOptions.queue == 'boolean'){
                    use_queue = queryOptions.queue;
                    delete queryOptions.queue;
                }

                var queryDefaults = {
                    data: {},
                    headers: {
                        "Content-Type" : "application/json"
                    },
                    success: function(response){
                        console.error('API request succeeded');
                        // console.error(response);
                    },
                    error: function(e){
                        // Not logged in?
                        console.error('API failed');
                        // e = JSON.parse(e);
                        if(e.code == 401 || e.status == 401){ // which one?
                            // Fully logout
                            Backbone.history.loadUrl('logout');
                        }
                    }
                };
                
                // Merge query options together
                queryOptions = $.extend(queryDefaults,queryOptions);

                // Modify the success and error functions to handle the debug_messages
                var queryOptionsBase = $.extend({},queryOptions);

                var debug_message = '';
                switch(url){
                    
                    case '/api/event':
                        if(queryOptions.data.type && queryOptions.data.type == 'multi'){
                            // multiple
                            // - see if all one type?
                            debug_message = url + ': ' + 'multiple';
                        } else {
                            // normal, with model
                            debug_message = url + ': ' + queryOptions.data.event;
                        }

                        break;

                    case '/api/event/remove':
                        debug_message = url + ': ' + queryOptions.data.event_id;
                        break;

                    case '/api/search':
                        if(queryOptions.data.type && queryOptions.data.type == 'multi'){
                            // multiple
                            // - see if all one type?
                            debug_message = url + ': ' + 'multiple';
                        } else {
                            // normal, with model
                            debug_message = url + ': ' + queryOptions.data.model;
                        }
                        break;

                    default: 
                        debug_message = url + ': ' + queryOptions.data.model;
                        break;
                }
                // var k = App.Utils.Notification.debug.create(debug_message);
                queryOptions.success = function(response){
                    // // Remove debug message
                    // App.Utils.Notification.debug.remove(k);

                    // Continue with response
                    // - should be using context or .apply(this...) ?
                    // console.error(queryOptionsBase);
                    response = JSON.parse(response);
                    var code = response.code,
                        data = response.data,
                        msg = response.msg;
                    queryOptionsBase.success.call(this, response, code, data, msg);
                };
                queryOptions.error = function(response){
                    // // Remove debug message
                    // App.Utils.Notification.debug.remove(k);

                    // // Continue with response
                    // // - should be using context or .apply(this...) ?
                    // // console.error(queryOptionsBase);
                    // queryOptionsBase.error.call(this,response);

                    // Re-try query
                    console.error('Failed query, trying again');
                    return Api.query(inputUrl,inputQueryOptions);
                };

                // // Check online status
                // if(!App.Data.online){
                //     window.setTimeout(function(){
                //         queryOptions.error.call('Not connected to internet')
                //     },1);
                //     App.Utils.Notification.toast('Not connected to the internet');
                //     return;
                // }

                // Merge data with auth
                var data = $.extend({},queryOptions.data);
                queryOptions.data = {
                                    auth: {
                                            app: App.Credentials.app_key,
                                            access_token: App.Data.access_token
                                        },
                                    data: data
                                    };

                queryOptions.data = JSON.stringify(queryOptions.data);
                
                if(url == '/api/search'){
                    url = App.Credentials.base_api_url + url;
                } else {
                    url = App.Credentials.base_api_url + url;
                }

                var ajaxOptions = $.extend(Api.defaults, {url: url});

                ajaxOptions = $.extend(ajaxOptions, queryOptions);

                use_queue = false;
                if(use_queue){
                    return Api.queue.add(ajaxOptions);
                } else {

                    return $.ajax(ajaxOptions); // promise?

                }

            }, 

            login: function(queryOptions){

                var url = '/api/login';

                var queryDefaults = {
                    data: {},
                    headers: {},
                    success: function(response){
                        // Succeeded
                    },
                    error: function(e){
                        console.error(e);
                        console.error('Search API failed');
                    }
                };
                
                queryOptions = $.extend(queryDefaults,queryOptions);

                // Merge data with auth
                var data = $.extend({},queryOptions.data);
                queryOptions.data = {
                                    auth: {
                                            app: App.Credentials.app_key
                                            //user_token: Api.user_token // just missing this field vs. a normal request
                                        },
                                    data: data
                                    };

                queryOptions.data = JSON.stringify(queryOptions.data);
                
                var ajaxOptions = $.extend(Api.defaults, {url: App.Credentials.base_api_url + url});

                ajaxOptions = $.extend(ajaxOptions, queryOptions);

                if(useForge){
                    return window.forge.ajax(ajaxOptions);
                } else {
                    return $.ajax(ajaxOptions);
                }

            },


            Event: {

                listener: null,
                listen_on: {},
                ignore_next: true, // Ignore the first incoming one
                start_listening: function(){
                    // Start listening on the socket.io feed
                    // return false;
                    console.log('Starting to listen...');
                    try {
                        var socket = io.connect(App.Credentials.base_listen_url + '/'); // SSL
                        // socket.heartbeatTimeout = 20000;
                    } catch(e){
                        // Not loaded, try again in a minute
                        console.log('not loaded socket.io');
                        console.log(e);
                        window.setTimeout(Api.Event.start_listening, 1000);
                        return;
                    }
                    var room_login = {
                        app: App.Credentials.app_key,
                        access_token: App.Credentials.access_token,
                        user: App.Credentials.user
                    };

                    // console.log('rl');
                    // console.log(room_login);
                    socket.on('disconnect',function(){
                        // // alert('disconnected');
                        // App.Utils.Notification.debug.temp('Disconnected from websocket');
                    });
                    socket.on('connect',function(){
                        // App.Utils.Notification.debug.temp('Connected to websocket');
                        socket.emit('room', JSON.stringify(room_login)); // log into room
                    });
                    socket.on('error', function(){
                        // App.Utils.Notification.debug.temp('Error with websocket');
                    });
                    socket.on('event', function (new_event) {

                        // See if Event.name exists
                        if(typeof(new_event.event) != 'string'){
                            // Missing
                            console.error('Missing new_event.event');
                            return;
                        }

                        console.log('Event incoming: ' + new_event.event);

                        // // Log that we received a new Event
                        // // console.error('Event Received:' + new_event.event);
                        // // console.error(new_event);
                        // // console.error(new_event);
                        // App.Utils.Notification.debug.temp('Event Received:' + new_event.event);

                        // Go through each plugin and fire the callback (with firebase data) if it matches
                        var fired = 0;
                        
                        $.each(Api.Event.listen_on,function(i,listener){
                            // console.error('listen_on');

                            // See if listener is on many different events
                            if(typeof(listener.data.event) != 'object'){
                                listener.data.event = [listener.data.event];
                            }

                            $.each(listener.data.event, function(i,lEvent){

                                if(lEvent != new_event.event){
                                    //console.error('Listener plugin not match Event (utils.js)');
                                    return;
                                }

                                // Events match, check the id (if necessary
                                if(listener.data.id != new_event.id){
                                    // Don't match
                                    // - null would have also matched
                                    //console.error('Listerner plugin did not match ID (utils.js)');
                                    // console.error(new_event.id);
                                    if(typeof listener.data.id != 'undefined'){
                                        return;
                                    }
                                }

                                // Looks good, fire the callback
                                // - async
                                // console.error('Firing callback');
                                listener.callback(new_event);
                                fired++;
                            });

                        });

                        // console.error('Fired '+fired+' callbacks');


                    });

                },


                on: function(data,callback){
                    // Adds another channel of data to listen for

                    // Model, Event.name, Data
                    // - can also include an id

                    /*
                    data: {
                        event: '
                    }
                    */

                    var id = Utils.guid();
                    Api.Event.listen_on[id] = {
                        data: data,
                        callback: callback
                    };

                    return id;

                },

                off: function(id){
                    // Turn off a listener
                    // - delete out of object

                    if(typeof(Api.Event.listen_on[id]) == 'undefined'){
                        return true;
                    }

                    delete Api.Event.listen_on[id];

                    return true;

                }

            }
            
    };

    return Api;

});