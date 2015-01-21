define(function(require) {

    "use strict";

    // Extras
    // var _ = require('underscore');
    // var Utils = require('utils');

    return {
        launch: function(key){

            var that = this;
            
            require(['utils'], function(Utils){


                var opts = {
                    
                };

                if(opts[key] === undefined){
                    Utils.Popover.Help({
                        title: 'Help Option Unavailable',
                        body: "I'm sorry, this help page isn't ready yet! <br />" + key
                    });
                    return;
                }

                // Show Help Popover
                switch(opts[key].type){
                    case 'popover':
                        Utils.Popover.Help(opts[key]);
                        break;
                    default:
                        console.error('unexpected');
                        break;
                }
            });

        }

    };

});