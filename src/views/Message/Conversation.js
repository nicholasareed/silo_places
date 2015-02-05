/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var RenderController = require('famous/views/RenderController');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    // Helpers
    var Utils = require('utils');
    var $ = require('jquery-adapter');
    var Handlebars = require('lib2/handlebars-helpers');

    var TabBar = require('famous/widgets/TabBar');
    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Subviews
    var StandardHeader = require('views/common/StandardHeader');
    var LayoutBuilder = require('views/common/LayoutBuilder');

    require('views/common/ScrollviewGoto');

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var numeral = require('lib2/numeral.min');

    // Subview
    var MessagesView      = require('./Subviews/Messages');
    
    // Models
    var ConnectionModel = require('models/any')('Connection');
    var MessageModel = require('models/any')('Message');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        this.loadModels();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 60
        });

        this._showing = true;

        this.createHeader();

        this._subviews = [];

        // Wait for User to be resolved
        // App.Data.User.populated().then((function(){
            this.createContent();
        // }).bind(this));

        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.loadModels = function(){
        var that = this;

        this.connection_id = this.params.args[0];

        // Load Connection
        this.model = new ConnectionModel.Model({
            _id: this.connection_id
        });
        this.model.populated().then(function(){
            // populated!
            console.log(that.model.toJSON());
            debugger;
        });
        // this.model.fetch();

    };
    
    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons
        this.headerContent = {};

        // quick invite
        this.headerContent.NewMessage = new Surface({
            content: '<i class="icon ion-paper-airplane"></i>',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.NewMessage.on('longtap', function(){
            Utils.Help('Data/List/Connection');
        });
        this.headerContent.NewMessage.on('click', function(){
            // Invite somebody
            // - manually enter data or scan a barcode, nfc, etc. 


            Utils.Popover.Prompt('Message Text')
            .then(function(messageText){
                if(!messageText){
                    return;
                }

                // Write to the database this new Message
                var newMessage = new MessageModel.Model({
                    to_connection_id: that.connection_id,
                    text: messageText,
                    created: new Date()
                });

                newMessage.save()
                .fail(function(){
                    console.error('Failed saving new Message');
                    Utils.Popover.Alert('Failed saving new Message');
                })
                .then(function(response){
                    // saved OK
                    Utils.Notification.Toast('Saved new Message');
                    console.log('response');
                    console.log(response);

                    console.log(newMessage.toJSON());

                    // Refresh the messages
                    // - should be auto-added? 
                    that.MessagesSubview.collection.fetch();

                    // Send to the other person via api/event/proxy
                    App.Api.event_proxy({
                        data: {
                            event: 'Message.incoming',
                            connection: that.connection_id,
                            obj: {
                                text: messageText
                            }
                        },
                        success: function(){
                            console.log('Sent successfully');
                            Utils.Notification.Toast('Sent successfully');
                        },
                        error: function(){
                            console.error('Failed sending via api/event/proxy');
                            Utils.Notification.Toast('Failed sending!');
                        }
                    });

                });

            });

        });

        // create the header
        this.header = new StandardHeader({
            content: "Conversation",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreSurfaces: [
                this.headerContent.NewMessage
            ]
        });
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();
        });

        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };
    
    PageView.prototype.createContent = function(){
        var that = this;

        this.content = new LayoutBuilder({
            size: [undefined, undefined],
            flexible: {
                key: 'ListHolder',
                direction: 1,
                ratios: [1],
                sequenceFrom: [
                // {
                //     plane: [null,10],
                //     surface: {
                //         key: 'Information',
                //         surface: new Surface({
                //             content: 'Your conversations are listed below!',
                //             wrap: '<div></div>',
                //             size: [undefined, true],
                //             classes: ['data-explorer-next-search']
                //         })
                //     }
                // },
                {
                    controller: {
                        key: 'Messages',
                        sequenceFrom: [{
                            surface: {
                                key: 'NoDataLoaded',
                                surface: new Surface({
                                    content: 'Loading Conversations',
                                    size: [undefined, true],
                                    classes: ['data-explorer-waiting-data']
                                })
                            }
                        }],
                        events: function(){

                            Timer.setTimeout(function(){
                                // Create new subview
                                var MessagesSubview = new MessagesView({
                                    modelName: 'Message',
                                    connection_id: that.connection_id
                                });
                                that.MessagesSubview = MessagesSubview;
                                that.content.ListHolder.Messages.show(MessagesSubview);
                            },1);
                        },
                        default: function(controller){
                            return controller.NoDataLoaded;

                            // Timer.setTimeout(function(){
                            //     console.log(controller);
                            //     debugger;
                            //     // that.content.ListHolder.Cards.show();
                            // },16);
                        }

                    }
                }]
            }
        });
    
        this.ContentStateModifier = new StateModifier();
        this.layout.content.add(this.ContentStateModifier).add(this.content);

    };

    PageView.prototype.refreshData = function() {
        try {
        }catch(err){};
    };

    PageView.prototype.remoteRefresh = function(snapshot){
        var that = this;
        console.log('RemoteRefresh - PageView');
        Utils.RemoteRefresh(this,snapshot);
    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        var args = arguments;

        this._eventOutput.emit('inOutTransition', arguments);

        // emit on subviews
        _.each(this._subviews, function(obj, index){
            obj._eventInput.emit('inOutTransition', args);
        });

        switch(direction){
            case 'hiding':
                this._showing = false;
                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        Timer.setTimeout(function(){

                            that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * (goingBack ? 1.5 : -1.5)),0,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;

            case 'showing':
                this._showing = true;
                if(this._refreshData){
                    Timer.setTimeout(this.refreshData.bind(this), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;


                        that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * (goingBack ? -1.5 : 1.5)),0,0));

                        // Content
                        // - extra delay
                        Timer.setTimeout(function(){

                            // Bring content back
                            that.ContentStateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);


                        break;
                }
                break;
        }
        
        return transitionOptions;
    };


    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50],
        },
        footer: {
            size: [0,0]
        },
        content: {
            size: [undefined, undefined],
            inTransition: true,
            outTransition: true,
            overlap: true
        }
    };

    module.exports = PageView;

});
