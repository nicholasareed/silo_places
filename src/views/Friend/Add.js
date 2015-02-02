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

    var LayoutBuilder = require('views/common/LayoutBuilder');
    var StandardHeader = require('views/common/StandardHeader');

    require('views/common/ScrollviewGoto');

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var numeral = require('lib2/numeral.min');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 60
        });

        this._showing = true;

        this.createHeader();

        this._subviews = [];

        this.createContent();

        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;
    
    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons
        this.headerContent = new View();

        // create the header
        this.header = new StandardHeader({
            content: "Create Connection",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
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


        this.contentLayout = new LayoutBuilder({
            size: [undefined, undefined],
            flexible: {
                direction: 1,
                ratios: [1,true,1],
                sequenceFrom: [{
                    surface: {
                        key: 'QrCode',
                        mods: [{
                            size: [undefined, undefined]
                        },"sizer",{
                            origin: [0.5,0.5],
                            align: [0.5,0.5]
                        }],
                        surface: new Surface({
                            content: '<div id="qrcode"></div>',
                            size: [true, true],
                            classes: ['connection-create-qrcode-holder']
                        }),
                        events: function(surface){
                            surface.on('deploy', function(){
                                var myDetails = {
                                    name: 'Otheruser',
                                    user_id: '5246a948-c2c3-45d8-a74e-023cb682c83b',
                                    user_server: App.Credentials.base_api_url
                                }
                                console.log(myDetails);
                                $('#qrcode').empty().qrcode({width: 200,height: 200,text: JSON.stringify(myDetails)});
                            });
                        }
                    }
                },{
                    surface: {
                        surface: new Surface({
                            content: '',
                            wrap: '<div></div>',
                            size: [undefined, true],
                            classes: ['connection-create-spacer']
                        })
                    }
                },{
                    surface: {
                        key: 'ScanButton',
                        mods: [{
                            size: [undefined, undefined]
                        },"sizer",{
                            origin: [0.5,0.5],
                            align: [0.5,0.5]
                        }],
                        surface: new Surface({
                            content: 'Scan QR Code',
                            wrap: '<div class="lifted"></div>',
                            size: [undefined, true],
                            classes: ['landing-button','silo-button']
                        }),
                        click: that.scan_barcode.bind(that)
                    }
                }]
            }
        });

        // Content Modifier
        this.ContentStateModifier = new StateModifier();


        this.layout.content.add(this.ContentStateModifier).add(this.contentLayout);

    };

    PageView.prototype.scan_barcode = function(ev){
        var that = this;

        this.in_scanner = true;

        cordova.plugins.barcodeScanner.scan(
            function (result) {
                that.in_scanner = false;

                if(result.cancelled){
                    return false;
                }

                // Got a result

                // Try and parse it as JSON (that is what we are expecting)
                try {
                    var data = JSON.parse(result.text);
                    if(typeof data != typeof({})){
                        throw "Failed 'data' type";
                    }
                } catch(err){
                    // Failed reading the code
                    Utils.Notification.Toast('Invalid Barcode');
                    return;
                }

                // Expecting "v" and "c" keys
                // - version
                // - code

                if(!data.version){
                    Utils.Notification.Toast('Sorry, this does not seem to be a valid invite barcode');
                    return;
                }


                console.log('Making request via api');

                App.Api.connection_create({
                    data: data.values,
                    error: function(err){
                        console.error('Failed!!!');
                        console.error(err);
                    },
                    success: function(response){
                        console.log(response);
                        if(response.code != 200){
                            alert('failed in code');
                        } else {
                            alert('ok');
                        }
                    }
                })


            }, 
            function (error) {
                // that.in_scanner = false;
                Utils.Notification.Toast("Scanning failed: " + error);
            }
        );

        return false;
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

    PageView.prototype.backbuttonHandler = function(snapshot){
        Utils.Notification.Toast(JSON.stringify(this.in_scanner));
        if(this.in_scanner){
            return;
        }
        App.history.back();
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
