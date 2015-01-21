//     (c) 2012 Raymond Julin, Keyteq AS
//     Backbone.touch may be freely distributed under the MIT license.
(function (factory) {

    "use strict";

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['underscore', 'backbone'], factory);
    } else {
        // Browser globals
        factory(_, Backbone);
    }
}(function (_, Backbone) {

    "use strict";


    var Utils   = require('utils');

    require(['api'], function(Api){

        /**
         * Semaphore mixin; can be used as both binary and counting.
         **/
        Backbone.Semaphore = {
            _permitsAvailable: null,
            _permitsUsed: 0,

            acquire: function() {
                if ( this._permitsAvailable && this._permitsUsed >= this._permitsAvailable ) {
                    throw new Error( 'Max permits acquired' );
                }
                else {
                    this._permitsUsed++;
                }
            },

            release: function() {
                if ( this._permitsUsed === 0 ) {
                    throw new Error( 'All permits released' );
                }
                else {
                    this._permitsUsed--;
                }
            },

            isLocked: function() {
                return this._permitsUsed > 0;
            },

            setAvailablePermits: function( amount ) {
                if ( this._permitsUsed > amount ) {
                    throw new Error( 'Available permits cannot be less than used permits' );
                }
                this._permitsAvailable = amount;
            }
        };

        /**
         * A BlockingQueue that accumulates items while blocked (via 'block'),
         * and processes them when unblocked (via 'unblock').
         * Process can also be called manually (via 'process').
         */
        Backbone.BlockingQueue = function() {
            this._queue = [];
        };
        _.extend( Backbone.BlockingQueue.prototype, Backbone.Semaphore, {
            _queue: null,

            add: function( func ) {
                if ( this.isBlocked() ) {
                    this._queue.push( func );
                }
                else {
                    func();
                }
            },

            // Some of the queued events may trigger other blocking events. By
            // copying the queue here it allows queued events to process closer to
            // the natural order.
            //
            // queue events [ 'A', 'B', 'C' ]
            // A handler of 'B' triggers 'D' and 'E'
            // By copying `this._queue` this executes:
            // [ 'A', 'B', 'D', 'E', 'C' ]
            // The same order the would have executed if they didn't have to be
            // delayed and queued.
            process: function() {
                var queue = this._queue;
                this._queue = [];
                while ( queue && queue.length ) {
                    queue.shift()();
                }
            },

            block: function() {
                this.acquire();
            },

            unblock: function() {
                this.release();
                if ( !this.isBlocked() ) {
                    this.process();
                }
            },

            isBlocked: function() {
                return this.isLocked();
            }
        });


        function silo_sync_model(method, model, options) {

            // var diff_match_patch     = require('dmp');

            // console.log('backbone model sync overwritten');
            // console.log('options');
            // console.log(options);

            var dfd = $.Deferred();

            options || (options = {});

            switch (method) {
                case 'create':
                    console.log('creating model');
                    debugger;
                    break;

                case 'update':
                    console.log('updating model');
                    console.log(method, model, options);

                    // Get changed attributes and update those only
                    // var changed = model.changed
                    var tmp_changedAttributes = model.changedAttributes(),
                        changedAttributes = {};

                    // Modify changedAttributes to handle lists/arrys correctly
                    // - should update the whole thing, not just the index position

                    _.each(tmp_changedAttributes, function(value, key){
                        // Determine if it is an array
                        var nkey = key.split('.');
                        nkey = nkey.splice(0,nkey.length-1).join('.');
                        if(nkey.length > 0){
                            if(Array.isArray(model.get(nkey))){
                                changedAttributes[nkey] = model.get(nkey);    
                                return;
                            }
                            // console.log(typeof(model.get(nkey)));
                        }
                        // By default, do the following
                        changedAttributes[key] = value;
                    });
                    // if(changedAttributes != tmp_changedAttributes){
                    //     console.log(changedAttributes);
                    //     console.log(tmp_changedAttributes);
                    //     debugger;
                    // }

                    var modelName = model.__proto__.modelName;
                    var data = {
                        model: modelName,
                        id: model.get('_id'),
                        paths: {
                            '$set' : changedAttributes
                        }
                    };

                    options.data = options.data || {}; // set default options data, and overwrite

                    _.extend(data, options.data);

                    Api.update({
                        data: data,
                        success: function(response){ // ajax arguments

                            if(response.code != 200){
                                console.log('=error');
                                model._errLast = true;
                                if(options.error) options.error(this,response);
                                dfd.reject();
                                return;
                            }

                            // Make sure there was one result updated
                            if(response.data != 1){
                                // Shoot!
                                console.error('Failed updating a single');
                                if(options.error) options.error(this,response);
                                dfd.reject();
                                return;
                            }

                            // Return single value
                            window.setTimeout(function(){

                                // Resolve
                                dfd.resolve(model.attributes);

                                // Fire success function
                                if(options.success){
                                    options.success(model.attributes);
                                }
                            },1);
                        
                        }
                    });

                    break;

                case 'delete':
                    break;

                case 'read':
                    // read/search request

                    // console.info('sync reading model');
                    // console.log(options);

                    var modelName = model.__proto__.modelName;
                    var data = {
                        model: modelName,
                        conditions: {
                            _id: model.get('_id') 
                        },
                        fields: this.search_fields,
                        limit: 1,

                        cache: false // enable patching
                    };

                    options.data = options.data || {}; // set default options data, and overwrite

                    _.extend(data, options.data);


                    // Get token hash for this query
                    var token = Utils.base64.encode(JSON.stringify(data));
                    if(App.Cache.Patching[token] != undefined){
                        data.hash = App.Cache.Patching[token].hash;
                    }

                    Api.search({
                        data: data,
                        success: function(response){ // ajax arguments

                            if(response.code != 200){
                                console.log('=error');
                                model._errLast = true;
                                if(options.error) options.error(this,response);
                                dfd.reject();
                                return;
                            }

                            model._fetched = true;
                            model._errLast = false;

                            // Patching?
                            if(response.hasOwnProperty('patch')){
                                // returned a patch

                                // do the patching
                                // - need to get our previous edition
                                // - apply the patch
                                // - re-save the data

                                // Get previous version of data
                                // - stored in memory, not backed up anywhere
                                // - included hash+text
                                try {
                                    // console.log(collection.model.internalModelName + '_' + model.id);
                                    if(App.Cache.Patching[token].text.length > 0){
                                        // ok

                                    }
                                } catch(err){
                                    // No previous cache to compare against!
                                    // - this should never be sent if we're sending a valid hash
                                    console.error('HUGE FAILURE CACHING!');
                                    console.log(err);
                                    return false;
                                }

                                // Create patcher
                                var dmp = new diff_match_patch();

                                // Build patches from text
                                var patches = dmp.patch_fromText(response.patch);

                                // get our result text!
                                var result_text = dmp.patch_apply(patches, App.Cache.Patching[token].text);

                                // Convert text to an object
                                try {
                                    response.data = JSON.parse(result_text[0]); // 1st, only 1 patch expected
                                } catch(err){
                                    // Shoot, it wasn't able to be an object, this is kinda fucked now
                                    // - need to 
                                    console.error('Failed recreating JSON');
                                    return false;
                                }

                            }

                            // console.log('Calling success');

                            // After patching (if any occurred)

                            // Return data without the 'Model' lead
                            var tmp = [];
                            var tmp = _.map(response.data,function(v){
                                return v[modelName];
                            });

                            // Did we only get a single value?
                            if(_.size(tmp) != 1){
                                // Shoot
                                dfd.reject(); // is this correct, to reject? 
                                if(options.error){
                                    options.error();
                                }
                                return;
                            }

                            // Update cache for patching
                            App.Cache.Patching[token] = {
                                hash: response.hash,
                                text: JSON.stringify(response.data)
                            };

                            // Return single value
                            window.setTimeout(function(){

                                // Resolve
                                dfd.resolve(tmp[0]);

                                // Fire success function
                                if(options.success){
                                    options.success(tmp[0]);
                                }
                            },1);
                        
                        }
                    });



                    // // Emailbox search
                    // Api.search({
                    //     data: options.data,
                    //     success: function(response){ // ajax arguments

                    //         response = JSON.parse(response);

                    //         if(response.code != 200){
                    //             console.log('=error');
                    //             if(options.error) options.error(this,response);
                    //             dfd.reject();
                    //             return;
                    //         }
                    //         // console.log('Calling success');

                    //         // data or patch?
                    //         if(response.hasOwnProperty('patch')){
                    //             // returned a patch

                    //             // do the patching
                    //             // - need to get our previous edition
                    //             // - apply the patch
                    //             // - re-save the data

                    //             // Get previous version of data
                    //             // - stored in memory, not backed up anywhere
                    //             // - included hash+text
                    //             try {
                    //                 // console.log(model.internalModelName + '_' + model.id);
                    //                 if(App.Data.Store.ModelCache[model.internalModelName + '_' + model.id].text.length > 0){
                    //                     // ok
                    //                 }
                    //             } catch(err){
                    //                 // No previous cache to compare against!
                    //                 // - this should never be sent if we're sending a valid hash
                    //                 console.error('HUGE FAILURE CACHING!');
                    //                 console.log(err);
                    //                 return false;
                    //             }

                    //             // Create patcher
                    //             var dmp = new diff_match_patch();

                    //             // Build patches from text
                    //             var patches = dmp.patch_fromText(response.patch);

                    //             // get our result text!
                    //             var result_text = dmp.patch_apply(patches, App.Data.Store.ModelCache[model.internalModelName + '_' + model.id].text);

                    //             // Convert text to an object
                    //             try {
                    //                 response.data = JSON.parse(result_text[0]); // 1st, only 1 patch expected
                    //             } catch(err){
                    //                 // Shoot, it wasn't able to be a object, this is kinda fucked now
                    //                 // - need to 
                    //                 console.log('Failed recreating JSON');
                    //                 console.log(response.data);
                    //                 return false;
                    //             }

                    //         }

                    //         // After patching (if any occurred)

                    //         // Return data without the 'Model' lead
                    //         var tmp = [];
                    //         var tmp = _.map(response.data,function(v){
                    //             return v[options.data.model];
                    //         });

                    //         // Did we only get a single value?
                    //         if(_.size(tmp) != 1){
                    //             // Shoot
                    //             dfd.reject(); // is this correct, to reject? 
                    //             if(options.error){
                    //                 options.error();
                    //             }
                    //             return;
                    //         }

                    //         // Return single value
                    //         window.setTimeout(function(){

                    //             // Resolve
                    //             dfd.resolve(tmp[0]);

                    //             // Fire success function
                    //             if(options.success){
                    //                 options.success(tmp[0]);
                    //             }
                    //         },1);

                    //         // Update cache with hash and text
                    //         App.Data.Store.ModelCache[model.internalModelName + '_' + model.id] = {
                    //             hash: response.hash,
                    //             text: JSON.stringify(response.data)
                    //         };

                    //     }
                    // });

                    break;
            }

            return dfd.promise();

        }

        function silo_sync_collection(method, model, options) {

            // console.log('backbone collection sync overwritten');

            var dfd = $.Deferred();

            options || (options = {});

            switch (method) {
                case 'create':
                    console.log('creating collection');
                    debugger;
                    break;

                case 'update':
                    console.log('updating collection');
                    debugger;
                    break;

                case 'delete':
                    break;

                case 'read':
                    // // read/search request
                    // // console.log('sync reading');
                    // // console.log(options);
                    // // console.log(model); // or collection
                    // // console.log(model.model.prototype.fields);

                    // // turn on caching for fucking everything yeah
                    // // - fuck it why not?
                    // if(App.Credentials.usePatching){
                    //     options.data.cache = true;
                    // }

                    // // Create namespace for storing
                    // // console.info(model);
                    // var ns = model.model.prototype.internalModelName + '_';

                    // // Need to include a passed new cachePrefix for some collections
                    // if(options.ns){
                    //     // console.warn('cachePrefix');
                    //     ns = ns + options.ns + '_';
                    // }

                    // // Collection namespace?
                    // // - for ids
                    // if(options.options && options.options.collectionCachePrefix){
                    //     ns = ns+ options.options.collectionCachePrefix + '_';
                    // }
                    // // console.log('ns');
                    // // console.log(ns);
                    // // console.log(options);
                    // // return false;

                    // // Get previous cache_hash
                    // // - just stored in memory for now
                    // try {
                    //     options.data.hash = App.Data.Store.CollectionCache[ns].hash;
                    // } catch(err){
                    //     // no hash exists
                    // }

                    var modelName = model.__proto__.model.prototype.modelName;
                    var data = {
                        model: modelName,
                        conditions: this.search_conditions,
                        fields: this.search_fields,
                        limit: this.search_limit || 10,
                        sort: this.sort_conditions || {
                            '_id' : -1
                        },
                        cache: false
                    };

                    options.data = options.data || {}; // set default options data, and overwrite

                    _.extend(data, options.data);

                    // Get token hash for this query
                    var token = Utils.base64.encode(JSON.stringify(data));
                    if(App.Cache.Patching[token] != undefined){
                        data.hash = App.Cache.Patching[token].hash;
                    }

                    var runFunc = function(data){
                        Api.search({
                            data: data,
                            success: function(response){ // ajax arguments

                                if(response.code != 200){
                                    console.log('=error');
                                    model._errLast = true;
                                    if(options.error) options.error(this,response);
                                    dfd.reject();
                                    return;
                                }

                                model._errLast = false;
                                model._fetched = true;
                                
                                // Patching?
                                if(response.hasOwnProperty('patch') && 1===0){
                                    // returned a patch

                                    // do the patching
                                    // - need to get our previous edition
                                    // - apply the patch
                                    // - re-save the data

                                    // Get previous version of data
                                    // - stored in memory, not backed up anywhere
                                    // - included hash+text
                                    try {
                                        // console.log(collection.model.internalModelName + '_' + model.id);
                                        if(App.Cache.Patching[token].text.length > 0){
                                            // ok

                                        }
                                    } catch(err){
                                        // No previous cache to compare against!
                                        // - this should never be sent if we're sending a valid hash
                                        console.error('HUGE FAILURE CACHING!');
                                        console.log(err);
                                        return false;
                                    }

                                    // Create patcher
                                    var dmp = new diff_match_patch();

                                    // Build patches from text
                                    var patches = dmp.patch_fromText(response.patch);

                                    // get our result text!
                                    var result_text = dmp.patch_apply(patches, App.Cache.Patching[token].text);

                                    // Convert text to an object
                                    try {
                                        response.data = JSON.parse(result_text[0]); // 1st, only 1 patch expected
                                    } catch(err){
                                        // Shoot, it wasn't able to be an object, this is kinda fucked now
                                        // - need to re-try the request, but instead skip patching (report that it failed though)
                                        console.error('Failed recreating JSON');
                                        data.hash = false;
                                        runFunc(data); // run it again
                                        // dfd.reject({patch_failed: true});
                                        return false;
                                    }

                                }

                                // console.log('Calling success');

                                // After patching (if any occurred)

                                // Return data without the 'Model' lead
                                var tmp = [];
                                var tmp = _.map(response.data,function(v){
                                    return v[modelName];
                                });

                                // Update cache for patching
                                App.Cache.Patching[token] = {
                                    hash: response.hash,
                                    text: JSON.stringify(response.data)
                                };

                                // Return single value
                                window.setTimeout(function(){

                                    // Resolve
                                    dfd.resolve(tmp);

                                    // Fire success function
                                    if(options.success){
                                        options.success(tmp);
                                    }
                                },1);
                            
                            }
                        });
                    }
                    runFunc(data);

                    break;
            }

            return dfd.promise();

        }

        _.extend( Backbone.Model.prototype, Backbone.Semaphore );

        var remoteToJSON = Backbone.Model.prototype.toJSON;
        _.extend(Backbone.Model.prototype, {
            search_conditions: {},
            search_fields: []
        });

        Backbone.Model.prototype.toJSON = function( options ) {
            var that = this;
            // If this Model has already been fully serialized in this branch once, return to avoid loops

            // var json = Backbone.Model.prototype.toJSON.call( this, options );
            var json = remoteToJSON.call(this, options);
            _.each( this.related, function( rel ) {
                // var related = json[ rel.key ],
                //     includeInJSON = rel.options.includeInJSON,
                //     value = null;

                // Already got model?
                if(!that._related.hasOwnProperty( rel.key )){
                    return;
                }

                // JSON related models
                var j = that._related[ rel.key].toJSON();
                json[ rel.key ] = j;

                // if ( includeInJSON === true ) {
                //     if ( related && _.isFunction( related.toJSON ) ) {
                //         value = related.toJSON( options );
                //     }
                // }
                // else if ( _.isString( includeInJSON ) ) {
                //     if ( related instanceof Backbone.Collection ) {
                //         value = related.pluck( includeInJSON );
                //     }
                //     else if ( related instanceof Backbone.Model ) {
                //         value = related.get( includeInJSON );
                //     }

                //     // Add ids for 'unfound' models if includeInJSON is equal to (only) the relatedModel's `idAttribute`
                //     if ( includeInJSON === rel.relatedModel.prototype.idAttribute ) {
                //         if ( rel instanceof Backbone.HasMany ) {
                //             value = value.concat( rel.keyIds );
                //         }
                //         else if  ( rel instanceof Backbone.HasOne ) {
                //             value = value || rel.keyId;
                //         }
                //     }
                // }
                // else if ( _.isArray( includeInJSON ) ) {
                //     if ( related instanceof Backbone.Collection ) {
                //         value = [];
                //         related.each( function( model ) {
                //             var curJson = {};
                //             _.each( includeInJSON, function( key ) {
                //                 curJson[ key ] = model.get( key );
                //             });
                //             value.push( curJson );
                //         });
                //     }
                //     else if ( related instanceof Backbone.Model ) {
                //         value = {};
                //         _.each( includeInJSON, function( key ) {
                //             value[ key ] = related.get( key );
                //         });
                //     }
                // }
                // else {
                //     delete json[ rel.key ];
                // }

                // if ( includeInJSON ) {
                //     json[ rel.keyDestination ] = value;
                // }

                // if ( rel.keyDestination !== rel.key ) {
                //     delete json[ rel.key ];
                // }
            });
            
            return json;
        };

        _.extend(Backbone.Collection.prototype, {
            search_conditions: {},
            search_fields: []
        });



        Backbone.Model.silo_sync = silo_sync_model;
        Backbone.Collection.silo_sync = silo_sync_collection;


        // Views

        _.extend(Backbone.View.prototype, {

            _apiEvents: [],
            _removeApiEvents: function(){
                _.each(this._apiEvents, function(ev){
                    Api.Events.off(ev);
                });
            },

            delegateEventsCustom: function(){
                return false;
            },
            _redelegate: function(){
                var that = this;

                // Remove events
                this.undelegateEvents();
                this.delegateEvents();

                // Custom delegation
                this.delegateEventsCustom();

                // Initiate _redelegate on child views
                this._subViews = this._subViews || [];
                _.each(this._subViews, function(subView){
                    subView._redelegate();
                });

                // // Run _redelegateCustom
                // if(this.hasOwnProperty('_redelegateCustom')){
                //     this._redelegateCustom();
                // }

            },

            _closeCustom: function(){
                return false;
            },

            _close: function(){
                // Execute _close on subViews as well
                this._subViews = this._subViews || [];
                _.each(this._subViews, function(sv){
                    if(typeof sv._close == 'function'){
                        sv._close();
                    }
                });

                // Run _closeCustom
                // if(this.hasOwnProperty('_closeCustom')){
                this._closeCustom();

            },

        });
    });

    return Backbone;
}));