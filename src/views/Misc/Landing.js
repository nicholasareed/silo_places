/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    // Curves
    var Easing = require('famous/transitions/Easing');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var InAppBrowserCSS = require('text!inappbrowsercss');
    var InAppBrowserJS = require('text!inappbrowserjs');
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');
    var Utils = require('utils');

    // Views
    var LayoutBuilder = require('views/common/LayoutBuilder');
    var StandardHeader = require('views/common/StandardHeader');
    var StandardPageView = require('views/common/StandardPageView');
    
    var EventHandler = require('famous/core/EventHandler');

    // Models
    var UserModel = require('models/user');

    // Custom Surface
    var TextAreaSurface = require('views/common/TextAreaSurface');


    function PageView(options) {
        var that = this;
        StandardPageView.apply(this, arguments);
        this.options = options;

        this.loadModels();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: 0, //App.Defaults.Header.size,
            footerSize: 200
        });

        this.layout.Bg = new Surface({
            content: '',
            size: [undefined, undefined],
            classes: ['landing-page-bg-default']
        });

        // this.createHeader();
        this.createContent();
        this.createFooter();
        
        // Assign to correct plane
        this.add(Utils.usePlane('content',-1)).add(this.layout.Bg);
        this.add(Utils.usePlane('content',1)).add(this.layout);

    }

    PageView.prototype = Object.create(StandardPageView.prototype);
    PageView.prototype.constructor = PageView;


    PageView.prototype.loadModels = function(){
        var that = this;

        // User
        this.model = new UserModel.User();

    };

    PageView.prototype.createHeader = function(){
        var that = this;

        // create the header
        this.header = new StandardHeader({
            content: " ",
            bgClasses: ['normal-header'],
            classes: ["normal-header"],
            backContent: false,
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            // App.history.back();
        });
        this.header.navBar.title.on('click', function(){
            // App.history.back();
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };


    PageView.prototype.createFooter = function(){
        var that = this;

        // Animation we'll use for these buttons
        var surfaceAnimation = function(surface, x, y){

            Timer.setTimeout(function(){
                surface.pipe(that.footer.scroller);
            },1);
            that._eventOutput.on('inOutTransition', function(args){

                var xOpacity = 1;
                if(Math.abs(x)){
                    xOpacity = 0;
                }

                if(args[0] == 'showing'){
                    surface.mods.Animate.setTransform(Transform.translate(x,y,0));
                    surface.mods.Animate.setTransform(Transform.translate(0,0,0), {
                        duration: Utils.randomInt(550,750),
                        curve: Easing.inOutBack
                    });

                    surface.mods.Animate.setOpacity(xOpacity);
                    surface.mods.Animate.setOpacity(1,{
                        duration: 960,
                        curve: Easing.easeOutBounce
                    });

                } else {
                    surface.mods.Animate.setTransform(Transform.translate(0,0,0));
                    surface.mods.Animate.setTransform(Transform.translate(x,y,0), {
                        duration: Utils.randomInt(350,550),
                        curve: Easing.inOutCubic
                    });

                    surface.mods.Animate.setOpacity(1);
                    surface.mods.Animate.setOpacity(xOpacity,{
                        duration: 350,
                        curve: Easing.easeIn
                    });
                }
            });
        };

        this.footer = new LayoutBuilder({
            scroller: {
                direction: 1,
                sequenceFrom: [{
                    surface: {
                        key: 'GoogleLogin',
                        mods: [{
                            key: 'Animate'
                        }],
                        surface: new Surface({
                            content: '<div class="lifted"><span><i class="icon ion-social-googleplus"></i></span>Google+</div>',
                            size: [Utils.WindowWidth(), 60],
                            classes: ['landing-button','gplus-button']
                        }),
                        click: function(){
                            // Pass off Google+ login/signup to the user's model
                            // Utils.Notification.Toast('Attempting signin');
                            var userModel = new UserModel.User();
                            userModel.gplus_login();
                        },
                        events: function(surface){
                            surfaceAnimation(surface, 0, 100);
                        }
                    }
                },{
                    surface: {
                        key: 'FacebookLogin',
                        mods: [{
                            key: 'Animate'
                        }],
                        surface: new Surface({
                            content: '<div class="lifted"><span><i class="icon ion-social-facebook"></i></span>Facebook</div>',
                            size: [Utils.WindowWidth(), 60],
                            classes: ['landing-button','facebook-button']
                        }),
                        click: function(){
                            // Pass off Facebook login/signup to the user's model
                            var userModel = new UserModel.User();
                            userModel.fb_login();
                        },
                        events: function(surface){
                            surfaceAnimation(surface, 0, 200);
                        }

                    }
                },
                {
                    size: [undefined, 60],
                    flexible: {
                        direction: 0,
                        ratios: [1,1],
                        sequenceFrom: [{
                            surface: {
                                key: 'EmailSignup',
                                mods: [{
                                    key: 'Animate'
                                }],
                                surface: new Surface({
                                    content: '<div>Sign Up</div>',
                                    size: [undefined, true],
                                    classes: ['landing-button','signup-button']
                                }),
                                click: function(){
                                    App.history.navigate('signup');
                                },
                                events: function(surface){
                                    surfaceAnimation(surface, -200, 0);
                                }

                            }
                        },{
                            surface: {
                                key: 'Login',
                                mods: [{
                                    key: 'Animate'
                                }],
                                surface: new Surface({
                                    content: '<div>Log In</div>',
                                    size: [undefined, true],
                                    classes: ['landing-button','login-button'] // landing-login-button
                                }),
                                click: function(){
                                    App.history.navigate('login');
                                },
                                events: function(surface){
                                    surfaceAnimation(surface, 100, 0);
                                }

                            }
                        }]
                    }
                }]
            }
        });

        // Animation Modifier
        this.layout.footer.animation = (function(){
            return new StateModifier({
                transform: Transform.translate(0,0,0)
            });
        })();

        // Attach to layout
        this.layout.footer.add(this.layout.footer.animation).add(this.footer);

    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        // Landing Page Title
        this.landingTitle = new View();
        this.landingTitle.OriginMod = new StateModifier({
            // align: [0.5, 0.5],
            // origin: [0.5,0.5]
        });
        this.landingTitle.Bg = new Surface({
            content: '',
            size: [undefined, 300],
            classes: ['landing-title-bg-gradient']
        });
        this.landingTitle.Surface = new Surface({
            content: '<div>'+App.Credentials.app_name+'</div><div>Start Something</div>',
            size: [undefined, true],
            classes: ['landing-page-logo-tagline']
        });

        this.landingTitle.add(Utils.usePlane('content',2)).add(this.landingTitle.Bg);

        this.landingNode = this.landingTitle.add(this.landingTitle.OriginMod);
        this.landingNode.add(Utils.usePlane('content',3)).add(this.landingTitle.Surface);


        // Content Modifiers
        this.layout.content.StateModifier = new StateModifier();

        // Now add content
        this.layout.content.add(this.layout.content.StateModifier).add(this.landingTitle);

    };

    PageView.prototype.backbuttonHandler = function(){
        // killing
        return false;
    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // Hide/move elements
                        Timer.setTimeout(function(){

                            // Opacity
                            that.layout.content.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // // Slide footer down
                            // that.layout.footer.animation.setTransform(Transform.translate(0,300,0),transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                if(this._refreshData){
                    // Timer.setTimeout(that.refreshData.bind(that), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // // Default position
                        // if(goingBack){
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0));
                        // that.contentScrollView.Views.forEach(function(surf, index){
                        //     surf.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0));
                        // });

                        // Opacity out
                        that.layout.content.StateModifier.setOpacity(0);

                        // // Slide footer up
                        // that.layout.footer.animation.setTransform(Transform.translate(0,300,0));


                        // Content
                        // - extra delay for other content to be gone
                        Timer.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            that.layout.content.StateModifier.setOpacity(1,transitionOptions.inTransition);

                            // that.layout.footer.animation.setTransform(Transform.translate(0,0,0),transitionOptions.inTransition);

                            // // Bring in button surfaces individually
                            // that.contentScrollView.Views.forEach(function(surf, index){
                            //     Timer.setTimeout(function(){
                            //         surf.StateModifier.setTransform(Transform.translate(0,0,0), {
                            //             duration: 250,
                            //             curve: Easing.easeOut
                            //         });
                            //     }, index * 50);
                            // });

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
            // inTransition: true,
            // outTransition: true,
            // look: {
            //     size: [undefined, 50]
            // }
        },
        footer: {
            size: [undefined, 0]
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


