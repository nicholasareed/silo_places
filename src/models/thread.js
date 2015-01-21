define(function (require) {

    "use strict";

    var $                   = require('jquery-adapter'),
        Backbone            = require('backbone-adapter'),
        Api                 = require('api'),
        ModelEmail          = require('models/email'),

        Thread = Backbone.DeepModel.extend({

            idAttribute: '_id',
            modelName: 'Thread',
            url: App.Credentials.base_api_url,

            _related: {},
            related: {
                Email: {
                    key: 'Email',
                    type: 'hasMany',
                    collection: ModelEmail.EmailCollection,
                    path: 'attributes.thread_id',
                    comparator: 'comparator_reverse'
                }
            },

            sync: Backbone.Model.emailbox_sync,

            initialize: function () {
                var that = this;
                _.bindAll(this, 'fetchRelated');
                this._related = {};
                _.each(this.related, function(related, key){
                    var collection;
                    if(that._related[related.key] == undefined){

                        collection = new related.collection;
                        that._related[ related.key ] = collection;
                        collection.search_conditions = {};
                        collection.search_conditions[ related.path ] = that.attributes._id

                        // comparator
                        if(related.comparator){
                            collection.comparator = collection[related.comparator];
                        }

                        collection.on('all', function(eventName, coll){
                            // console.log(eventName);
                            // this._related[ related.key ] = collection; // removing this line causes a fuckup!
                            this.trigger('related:' + eventName,coll);
                            this.trigger('related:' + related.key +':' + eventName,coll);
                            // console.log('related:' + related.key +':' + eventName,coll);
                            // console.log('was reset');
                        },that);

                        // collection.on('add', function(model){
                        //     model.on('change', function(){
                        //         // this.trigger('related:' + eventName,coll);
                        //         // this.trigger('related:' + related.key +':' + eventName,coll);
                        //         console.log('ChANGED');
                        //     }, that);
                        // }, that);

                    } else {
                        collection = that._related[related.key];
                    }

                    // No fetch needed
                    // collection.fetch(options);
                });

            },

            fetchRelated: function(options){
                var that = this,
                    defaultOptions = {
                        reset: false
                    };
                options = _.extend(defaultOptions, options || {});
                // console.log(this.related.length);
                _.each(this.related, function(related){
                    // var collection;
                    // collection = that._related[related.key];

                    that._related[related.key].fetch(options);
                });

            },

            fetchRelated2: function(options){
                var that = this,
                    defaultOptions = {
                        reset: false
                    };
                options = _.extend(defaultOptions, options || {});
                _.each(this.related, function(related){
                    if(that._related[ related.key ] == undefined){

                        // Create the collection and store it

                        var collection = new related.collection;
                        that._related[ related.key ] = collection;

                        collection.search_conditions = {};
                        collection.search_conditions[ related.path ] = that.attributes._id

                        // comparator
                        if(related.comparator){
                            collection.comparator = collection[related.comparator];
                        }

                        collection.on('reset', function(coll){
                            this._related[ related.key ] = collection; // removing this line causes a fuckup!
                            this.trigger('related:reset',coll);
                            this.trigger('related:' + related.key +':reset',coll);
                            // console.log('was reset');
                        },that);

                        // collection.on('all', function(eventName, coll){
                        //     this._related[ related.key ] = collection; // removing this line causes a fuckup!
                        //     this.trigger('related:' + eventName,coll);
                        //     this.trigger('related:' + related.key +':' + eventName,coll);
                        //     // console.log('was reset');
                        // },that);

                    }

                    // Fetch with options
                    that._related[ related.key ].fetch(options);
                });

            }


        }),

        ThreadCollection = Backbone.Collection.extend({

            model: Thread,
            url: App.Credentials.base_api_url,

            search_conditions: {},
            sort_conditions: {
                'attributes.last_message_datetime_sec' : -1
            },
            search_limit: 10,

            sync: Backbone.Collection.emailbox_sync,
            comparator: function(model1, model2){
                var m1 = moment(model1.attributes.attributes.last_message_datetime),
                    m2 = moment(model2.attributes.attributes.last_message_datetime);
                if(m1 > m2){
                    return -1;
                }
                if(m1 == m2){
                    return 0;
                }
                return 1;
            },

            initialize: function(models, options){
                options = options || {};
                this.options = options;
                
                if(options.type == 'label'){
                    var key = 'attributes.labels.' + options.text;
                    this.search_conditions = {};
                    this.search_conditions[key] = 1;
                }

                // Overwriting parameters
                this.search_conditions = options.search_conditions || this.search_conditions;
                this.sort_conditions = options.sort_conditions || this.sort_conditions;
                this.search_limit = options.search_limit || this.search_limit;

            },

            fetch_search_results: function(options){
                // Conducts a search against Threads and Emails, and returns a collection of related Thread and Emails
                var that = this;

                var text = options.text;

                var deferredSearches = [];

                var and_fields = {}; // todo...

                // escape regex characters
                // text = text.replace(/[#-}]/g, '\\$&'); // escape regex characters from search string
                text = text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')

                // Email searching::

                // Normal Email fields to search for text
                var email_filter_fields = [
                    'app.AppPkgDevMinimail.note', // only on Thread level? (no, on Email level too...)
                    'original.ParsedData.0.Data',
                    // 'original.HtmlBody',
                    'original.HtmlTextSearchable', // - strip html (for searching HTML views)
                    'original.headers.Subject',
                    'original.headers.From',
                    'original.headers.To',
                    'original.headers.Reply-To',
                    'original.attachments.name' // array
                ];
                // Normal Email fields to search for text
                var thread_filter_fields = [
                    'app.AppPkgDevMinimail.note'
                ];

                var tmp_email_filter_fields = [];
                $.each(email_filter_fields,function(k,val){
                    var d = {};
                    d[val] = {
                        "$regex" : '(' + text + ')',
                        "$options" : 'i'
                    };
                    tmp_email_filter_fields.push(d);
                });

                var email_search_conditions = {
                    "$or" : tmp_email_filter_fields
                };

                deferredSearches.push( Api.search({
                    data: {
                        model: 'Email',
                        conditions: email_search_conditions,
                        fields : ['_id','attributes.thread_id','_modified'],
                        limit : 50,
                        sort: {"_id" : -1} // most recently received (better way of sorting?)
                    },
                    success: function(response){
                        // responded OK
                        console.log('FINISHED SEARCHING EMAILS');
                    }
                }) );


                // Thread Searching::

                // Normal Thread fields to search for text
                var thread_filter_fields = [
                    'app.AppPkgDevMinimail.note'
                ];
                // Normal Thread fields to search for text
                var thread_filter_fields = [
                    'app.AppPkgDevMinimail.note'
                ];

                var tmp_thread_filter_fields = [];
                $.each(thread_filter_fields,function(k,val){
                    var d = {};
                    d[val] = {
                        "$regex" : '(' + text + ')',
                        "$options" : 'i'
                    };
                    tmp_thread_filter_fields.push(d);
                });

                var thread_search_conditions = {
                    "$or" : tmp_thread_filter_fields
                };

                deferredSearches.push( Api.search({
                    data: {
                        model: 'Thread',
                        conditions: thread_search_conditions,
                        fields : ['_id','_modified'],
                        limit : 50,
                        sort: {"_id" : -1} // most recently received (better way of sorting?)
                    },
                    success: function(response){
                        // responded OK
                        // console.log('FINISHED SEARCHING EMAILS');
                    }
                }) );

                $.when.apply(this, deferredSearches).then(function(emailResponse, threadResponse){ // expecting two arguments
                    // Completed all our preliminary searches
                    // - now actually gathering the Threads and Emails

                    var thread_ids = [];

                    // // arguments passed in
                    // _.each(arguments, function(response, code, data){
                    //     // Each returned argument is actually a response object
                    //     if(response.code != 200){
                    //         // Shoot
                    //         return;
                    //     }

                    //     thread_ids.push( _.map(response.data, function(){
                    //         return email.
                    //     }) );

                    // });

                    _.each(emailResponse.data, function(email){
                        thread_ids.push(email.Email.attributes.thread_id);
                    });

                    _.each(threadResponse.data, function(thread){
                        thread_ids.push(thread.Thread._id);
                    });


                    // remove duplicates
                    thread_ids = _.uniq(thread_ids);

                    // Conduct collection fetch (and fetchRelated)
                    that.search_conditions = {
                        _id: {
                            '$in' : thread_ids
                        }
                    };
                    that.search_limit = 10;

                    // actually run the .fetch
                    console.log(that.search_conditions);
                    // debugger;
                    that.fetch(options.options);

                });

            }

        });

    return {
        Thread: Thread,
        ThreadCollection: ThreadCollection
    };

});