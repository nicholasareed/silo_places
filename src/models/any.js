define(function (require) {

    "use strict";

    var $                   = require('jquery-adapter'),
        Backbone            = require('backbone-adapter'),
        Api                 = require('api'),

        Any = Backbone.DeepModel.extend({

            idAttribute: '_id',
            modelName: 'Any',
            url: App.Credentials.base_api_url,

            _related: {},
            // related: {
            //     Email: {
            //         key: 'Email',
            //         type: 'hasMany',
            //         collection: ModelEmail.EmailCollection,
            //         path: 'attributes.thread_id',
            //         comparator: 'comparator_reverse'
            //     }
            // },

            sync: Backbone.Model.silo_sync,

            initialize: function () {
                var that = this;
                _.bindAll(this, 'fetchRelated');
                this._related = {};
                this.related = this.related || {};
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
                _.each(this.related, function(related){
                    that._related[related.key].fetch(options);
                });

            },


        });

    Any = Backbone.UniqueModel(Any);

    var AnyCollection = Backbone.Collection.extend({

            model: Any,
            url: App.Credentials.base_api_url,

            search_conditions: {},
            sort_conditions: {
                'attributes.last_message_datetime_sec' : -1
            },
            search_limit: 10,

            sync: Backbone.Collection.silo_sync,

            initialize: function(models, options){
                options = options || {};
                this.options = options;

                // Overwriting parameters
                this.search_conditions = options.search_conditions || this.search_conditions;
                this.sort_conditions = options.sort_conditions || this.sort_conditions;
                this.search_limit = options.search_limit || this.search_limit;

            },

        });

    return {
        Any: Any,
        AnyCollection: AnyCollection
    };

});