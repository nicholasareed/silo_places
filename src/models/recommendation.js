define(function (require) {

    "use strict";

    var $                   = require('jquery-adapter'),
        Backbone            = require('backbone-adapter'),
        Api                 = require('api'),

        Recommendation = Backbone.DeepModel.extend({

            idAttribute: '_id',
            modelName: 'Recommendation',
            url: App.Credentials.base_api_url,

            // _related: {},
            // related: {
            //     Email: {
            //         key: 'Email',
            //         type: 'hasMany',
            //         collection: ModelEmail.EmailCollection,
            //         path: 'attributes.recommendation_id',
            //         comparator: 'comparator_reverse'
            //     }
            // },
            related: {},

            sync: Backbone.Model.silo_sync,

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

            }


        }),

        RecommendationCollection = Backbone.Collection.extend({

            model: Recommendation,
            url: App.Credentials.base_api_url,

            search_conditions: {},
            sort_conditions: {},
            search_limit: 10,

            sync: Backbone.Collection.emailbox_sync,
            // comparator: function(model1, model2){
            //     var m1 = moment(model1.attributes.attributes.last_message_datetime),
            //         m2 = moment(model2.attributes.attributes.last_message_datetime);
            //     if(m1 > m2){
            //         return -1;
            //     }
            //     if(m1 == m2){
            //         return 0;
            //     }
            //     return 1;
            // },

            initialize: function(models, options){
                options = options || {};
                this.options = options;
                
                if(options.type == 'label'){
                    // var key = 'attributes.labels.' + options.text;
                    // this.search_conditions = {};
                    // this.search_conditions[key] = 1;
                }

                // Overwriting parameters
                this.search_conditions = options.search_conditions || this.search_conditions;
                this.sort_conditions = options.sort_conditions || this.sort_conditions;
                this.search_limit = options.search_limit || this.search_limit;

            }

        });

    return {
        Recommendation: Recommendation,
        RecommendationCollection: RecommendationCollection
    };

});