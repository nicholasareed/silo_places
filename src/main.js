require.config({

    // urlArgs: 'v2.3',
    urlArgs: new Date().toString(),

    // baseUrl: 'src/lib',

    // map: {
    //  '*': {
    //      backbone: '../src/lib2/backbone',
    //      underscore: '../src/lib2/underscore',
    //      jquery: '../src/lib2/jquery'
    //  }
    // },
    waitSeconds: 7,
    paths: {
        // appLib: '../src/lib2/',
        // famous: '../lib/famous',
        // requirejs: '../lib/requirejs/require',
        // almond: '../lib/almond/almond',
        // 'famous-polyfills': '../lib/famous-polyfills/index',

        config: PhoneGapApp?'config.xml':'../config.xml',

        'famous-boxlayout': 'bower_components/famous-boxlayout/BoxLayout',

        async : '../src/requirejs-plugins/src/async',

        underscore: '../src/lib2/underscore',
        jquery: '../src/lib2/jquery',
        backbone: '../src/lib2/backbone',
        moment: '../src/lib2/moment',
        numeral: '../src/lib2/numeral.min',
        // history: '../src/lib2/history',
        utils: '../src/utils',
        api: '../src/lib2/api',
        handlebars: '../src/lib2/handlebars',
        'backbone-adapter' : '../src/lib2/backbone-adapter',
        'jquery-adapter' : '../src/lib2/jquery-adapter',

        inappbrowsercss: '../css/inappbrowser.css',
        inappbrowserjs: '../src/views/Misc/inappbrowser.js'
    },

    shim: {
        'underscore': {
            exports: '_'
        },
        'jquery' : {
            exports: 'jquery',
        },
        'backbone': {
            deps: ['underscore', 'jquery','moment'],
            exports: 'Backbone'
        },
        'backbone-adapter': {
            deps: ['backbone'],
            exports: 'Backbone'
        },
        'jquery-adapter': {
            deps: ['jquery'],
            exports: 'jquery'
        },
        'hammer' : {
            deps: ['jquery'],
            exports: 'Hammer'
        },
        'handlebars' : {
            exports: 'Handlebars'
        },
        'handlebars-adapter' : {
            deps: ['handlebars'],
            exports: 'Handlebars'
        },

        'lib2/leaflet/leaflet.label' : {
            deps: ['lib2/leaflet/leaflet']
        },
        'lib2/leaflet/leaflet.iconlabel' : {
            deps: ['lib2/leaflet/leaflet']
        },
        'lib2/leaflet/tile.stamen' : {
            deps: ['lib2/leaflet/leaflet']
        }

        // // 'async!http://maps.googleapis.com/maps/api/js?sensor=false'

        // 'http://maps.googleapis.com/maps/api/js?sensor=false' : {
        //     // deps: ["src/lib2/map_markerWithLabel.js",
        //     //         "src/lib2/map_styledmarker.js",
        //     //         "src/lib2/map_geomarker.js",
        //     //         "src/lib2/map_markerclusterer.js",
        //     //         "src/lib/functionPrototypeBind.js",
        //     //         "src/lib/classList.js",
        //     //         "src/lib/requestAnimationFrame.js"]
        // },
        // // Google maps
        //             "http://maps.googleapis.com/maps/api/js?sensor=false",
        //             "src/lib2/map_markerWithLabel.js",
        //             "src/lib2/map_styledmarker.js",
        //             "src/lib2/map_geomarker.js",
        //             "src/lib2/map_markerclusterer.js",
        //             "src/lib/functionPrototypeBind.js",
        //             "src/lib/classList.js",
        //             "src/lib/requestAnimationFrame.js",
    },

});

// Global "App" variable
var App = {},
    S = null; // used for Utils.hbSanitize

define(function(require, exports, module) {
    'use strict';

    // var FastClick = require('famous/inputs/FastClick');

    // import dependencies
    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var RenderController = require('famous/views/RenderController');
    var Lightbox = require('famous/views/Lightbox');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var Modifier = require('famous/core/Modifier');
    var Transform = require('famous/core/Transform');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Matrix = require('famous/core/Transform');
    var RenderNode = require('famous/core/RenderNode');

    var Easing = require('famous/transitions/Easing');
    var Timer = require('famous/utilities/Timer');

    var StandardTabBar = require('views/common/StandardTabBar');

    var EventHandler = require('famous/core/EventHandler');

    var Backbone = require('backbone');
    var DeviceReady = require('./device_ready');
    var $ = require('jquery-adapter');
    require('lib2/hammer'); // creates global Hammer()
    var _ = require('underscore');
    var Utils = require('utils');
    S = Utils.hbSanitize;

    var Api = require('api');

    // Models
    var PreloadModels = require('models/preload');
    var UserModel = require('models/user');

    console.info('Loaded main.js');
    var tmpDefaultCache = { // replace in Utils.logout too!
        geolocation_coords: {latitude:0.1,longitude:0.1},
        ModelReplacers: {},
        RoutesByHash: {}
    };
    var tmpDefaultViews = {
        Popover: {},
        MainFooter: null
    };
    // Data store
    App = {
        $: $,
        t: null, // for translation
        Utils: Utils,
        Flags: {},
        Functions: {}, // some global functions, like for Splash
        KeyboardShowing: false,
        MainContext: null,
        MainController: null,
        MainView: null,
        Events: new EventHandler(),
        BackboneEvents: _.extend({}, Backbone.Events),
        Credentials: JSON.parse(require('text!credentials.json')),
        Config: null, // parsed in a few lines, symlinked to src/config.xml
        ConfigImportant: {},
        Analytics: null,
        BackboneModels: _.extend({}, Backbone.Events),
        Router: null,
        DefaultViews: tmpDefaultViews,
        Views: Utils.toJSONandBack(tmpDefaultCache), //_.defaults({},tmpDefaultViews),
        DefaultCache: Utils.toJSONandBack(tmpDefaultCache), //$.extend(tmpDefaultCache,{deep:true}),
        Cache: $.extend(tmpDefaultCache,{deep:true}),
        Data: {
            User: null
        },
        Defaults: {
            ScrollView: {
                // friction: 0.001,
                // drag: 0.0001,
                // edgeGrip: 0.5,
                // edgePeriod: 500, //300,
                // edgeDamp: 1,
                // speedLimit: 2

                // friction: 0.0001, // default 0.001
                // edgeGrip: 0.05, // default 0.5
                // speedLimit: 2.5 // default 10
            },
            Header: {
                Icon: {
                    w: 50 // width
                },
                size: 60 // height, width always undefined width
            },
            Footer: {
                size: 0 // height, width always undefined
            },
        },
        Planes: {
            fps: 10, // 10=hidden, frames-per-second counter
            background: -1000000,
            content: 100,
            contentTabs: 400,
            header: 500,
            footer: 500,
            mainfooter: 500,
            popover: 2000,
            splashLoading: 2100,
            statusBar: 3000
        }
    };

    // Update body stylesheet
    // - remove loading background
    // - waiting for Splash screen to take over for a moment
    Timer.setTimeout(function(){
        document.body.setAttribute('style',"");
        $('.before-loaded-screen').remove();
    },350);

    // Config file, symlinked (ln -s) into multiple directories
    var ConfigXml = '';
    try {
        ConfigXml = require('text!config');
    }catch(err){
        // ConfigXml = require('text!config.xml');
        // debugger;
    }

    // Parse config.xml and set approprate App variables
    App.Config = $($.parseXML(ConfigXml));
    if(App.Config.find("widget").get(0).attributes.id.value.indexOf('.pub') !== -1){
        App.Prod = true;
        App.ConfigImportant.Version = App.Config.find("widget").get(0).attributes.version.value;
        App.ConfigImportant.StatusBarBackgroundColor = App.Config.find("widget").find('preference[name="StatusBarBackgroundColor"]').get(0).attributes.value.value;
    }

    // Run DeviceReady actions
    // - Push Notifications
    // - Resume, Back, etc.
    App.DeviceReady = DeviceReady;
    App.DeviceReady.init();
    // App.DeviceReady.ready.then(function(){
    //     App.DeviceReady.runGpsUpdate();
    // });

    // Language set?
    // - localization / globalization
    App.Cache.Language = localStorage.getItem('language_v1');
    var LanguageDef = $.Deferred();
    if(!App.Cache.Language || App.Cache.Language.length <= 0){
        App.Cache.Language = 'en';
        // Get Language
        try {
            navigator.globalization.getLocaleName(
                function (locale) {
                    console.info('locale: ' + locale.value);
                    // Set the locale
                    // - should validate we support this locale!
                    var localeNormalized = Utils.Locale.normalize(locale.value);
                    if(localeNormalized !== false){
                        // valid value!
                        console.info('locale normalized: ' + localeNormalized);
                        App.Cache.Language = localeNormalized;
                    }
                    LanguageDef.resolve();
                },
                function () {
                    alert('Error getting locale');
                }
            );
        }catch(err){
            // use default
            LanguageDef.resolve();
        }
    } else {
        // Have the language already
        LanguageDef.resolve();
    }
    
    // Localization
    LanguageDef.promise().then(function(){
        $.i18n.init({
            lng: App.Cache.Language, //'ru',
            ns: {namespaces: ['ns.common'], defaultNs: 'ns.common'}, //{ namespaces: ['ns.common', 'ns.special'], defaultNs: 'ns.special'},
            useLocalStorage: false,
            debug: true
        },function(t){
            // localization initialized
            App.t = t;

            // Router
            App.Router = require('router')(App); // Passing "App" context to Router also


            // Sizing
            App.defaultSize = [Utils.WindowWidth(), Utils.WindowHeight()]; // use Device Width/height via native plugin? 
            // document.body.setAttribute('style',"width:"+window.innerWidth+"px;height:"+window.innerHeight+"px");
            // Utils.Notification.Toast(window.innerHeight);
            App.mainSize = [Utils.WindowWidth(), Utils.WindowHeight()];
            // Engine.nextTick(function() {
            //     console.log('After tick=' + App.MainContext.getSize());
            //     App.mainSize = App.MainContext.getSize();
            // });
            console.log('App Size:', App.mainSize);

            // create the main context
            App.MainContext = Engine.createContext();
            window.context = App.MainContext;
            App.MainContext.setPerspective(1000);

            // MainView
            App.MainView = new View();
            App.MainView.OuterSizeMod = new StateModifier({
                size: [undefined, undefined]
            });
            App.MainView.OriginMod = new StateModifier({
                origin: [0.5, 0],
                align: [0.5, 0]
            });
            App.MainView.InnerSizeMod = new StateModifier({
                size: App.mainSize
            });
            //.add(App.MainView.OuterSizeMod).add(App.MainView.OriginMod).add(App.MainView.InnerSizeMod)
            App.MainContext.add(App.MainView.OuterSizeMod).add(App.MainView.OriginMod).add(App.MainView.InnerSizeMod).add(App.MainView);

            // Add main background image (pattern)
            App.MainBackground = new Surface({
                size: [undefined, undefined],
                classes: ['overall-background']
            });
            App.MainView.add(Utils.usePlane('background')).add(App.MainBackground); 

            // Create main Lightbox
            App.MainController = new Lightbox();
            // App.MainController.getSize = function(){
            //     return [undefined, undefined];
            // };
            App.MainController.resetOptions = function(){
                this.setOptions(Lightbox.DEFAULT_OPTIONS);
            };
            
            // Resize
            App.Events.on('resize', function(e) {
                // Utils.Notification.Toast('Resized');
                App.MainView.InnerSizeMod.setSize(App.mainSize);
                // document.body.setAttribute('style',"height:"+App.mainSize[1]+"px");
            }.bind(this));


            // Layout for StatusBar / Controller
            if(App.Config.devicePlatform == 'ios'){
                App.StatusBar = true;
            }

            // App.StatusBar set in device_ready
            App.DeviceReady.ready.then(function(){

                var ratios = [1];
                if(App.StatusBar === true){
                    ratios = [true, 1];
                }
                App.MainView.Layout = new FlexibleLayout({
                    direction: 1,
                    ratios: ratios
                });
                App.MainView.Layout.Views = [];


                // iOS StatusBar (above MainController lightbox, if necessary)
                App.StatusBarView = new View();
                App.StatusBarView.getSize = function(){
                    return [undefined, 20];
                };
                App.StatusBarView.Controller = new RenderController();
                App.StatusBarView.add(Utils.usePlane('statusBar')).add(App.StatusBarView.Controller);

                // Animate new colors accordingly (wish it were easier)
                App.StatusBarView.newSurface = function(surf){
                    // animates in a new Surface
                    if(surf instanceof Surface){
                        debugger;
                        // App.StatusBarView.Controller.show(surf);
                        // return;
                    }

                    // create new surface for color, if passed that in an object
                    if(surf.bgClasses){

                        var tmpSurf = new Surface({
                            size: [undefined, 20],
                            classes: surf.bgClasses
                        })

                        console.info(surf.bgClasses);

                        App.StatusBarView.Controller.show(tmpSurf);
                        return;
                    }

                    // what else?
                    console.error('no other handler for newSurface');
                    
                };

                // Add first surface
                App.StatusBarView.newSurface({
                    bgClasses: ['header-bg-default']
                });


                // Add to Layout
                if(App.StatusBar === true){
                    App.MainView.Layout.Views.push(App.StatusBarView);
                }

                App.MainView.Layout.Views.push(App.MainController);
                App.MainView.Layout.sequenceFrom(App.MainView.Layout.Views);

                // Add Lightbox/RenderController to mainContext
                App.MainView.add(App.MainView.Layout);

            });

            // Main Footer
            var createMainFooter = function(){
                // var that = this;
                App.Views.MainFooter = new View();

                App.Views.MainFooter.Bg = new Surface({
                    size: [undefined, undefined],
                    classes: ['footer-tabbar-background']
                });

                // create the footer
                App.Views.MainFooter.Tabs = new StandardTabBar();  
                var tmpTabs = App.Views.MainFooter.Tabs;

                tmpTabs.defineSection('home', {
                    content: '<i class="icon ion-home"></i><div><span class="ellipsis-all">'+App.t('footer.waiting')+'</span></div>',
                    onClasses: ['footer-tabbar-default', 'on'],
                    offClasses: ['footer-tabbar-default', 'off']
                });
                tmpTabs.defineSection('messages', {
                    content: '<i class="icon ion-paper-airplane"></i><div><span class="ellipsis-all">'+App.t('footer.messages')+'</span></div>',
                    onClasses: ['footer-tabbar-default', 'on'],
                    offClasses: ['footer-tabbar-default', 'off']
                });
                tmpTabs.defineSection('profiles', {
                    content: '<i class="icon ion-person"></i><div><span class="ellipsis-all">'+App.t('footer.profiles')+'</span></div>',
                    onClasses: ['footer-tabbar-default', 'on'],
                    offClasses: ['footer-tabbar-default', 'off']
                });
                tmpTabs.defineSection('friends', {
                    content: '<i class="icon ion-person-stalker"></i><div><span class="ellipsis-all">'+App.t('footer.friends')+'</span></div>',
                    onClasses: ['footer-tabbar-default', 'on'],
                    offClasses: ['footer-tabbar-default', 'off']
                });



                tmpTabs.on('select', function(result, eventTriggered){
                    console.error(eventTriggered);
                    console.error(result);
                    switch(result.id){
                        
                        case 'home':
                            App.history.navigate('user/waiting');
                            break;

                        case 'profiles':
                            // display the "last" profile we looked at
                            if(App.history.findLastTag('user')){
                                // found a tag to go back to
                                App.history.backTo('user');
                            } else {
                                // show the default user
                                if(App.Data.User.hasFetched){
                                    App.history.navigate('user/' + App.Data.User.get('_id'));
                                    return;
                                }
                                App.history.navigate('user',{history: false});
                            }
                            break;

                        case 'messages':
                            App.history.navigate('inbox');
                            break;

                        case 'friends':
                            App.history.navigate('friend/list');
                            break;

                        default:
                            alert('none chosen');
                            break;
                    }
                });

                // Attach header to the layout 
                App.Views.MainFooter.originMod = new StateModifier({
                    origin: [0.5, 1],
                    align: [0.5,1]
                });
                App.Views.MainFooter.positionMod = new StateModifier({
                    transform: Transform.translate(0,60,0)
                });
                App.Views.MainFooter.sizeMod = new StateModifier({
                    size: [undefined, 60]
                });

                var node = App.Views.MainFooter.add(App.Views.MainFooter.originMod).add(App.Views.MainFooter.positionMod).add(App.Views.MainFooter.sizeMod);
                node.add(App.Views.MainFooter.Bg);
                node.add(App.Views.MainFooter.Tabs);

                App.Views.MainFooter.show = function(transition){
                    transition = transition || {
                        duration: 750,
                        curve: Easing.outExpo
                    };
                    App.Views.MainFooter.positionMod.setTransform(Transform.translate(0,0,0), transition);
                };

                App.Views.MainFooter.hide = function(transition){
                    transition = transition || {
                        duration: 250,
                        curve: Easing.inExpo
                    };
                    App.Views.MainFooter.positionMod.setTransform(Transform.translate(0,1000,0), transition);
                };

                // Add to maincontext
                App.MainView.add(Utils.usePlane('mainfooter')).add(App.Views.MainFooter);

            };
            createMainFooter();

            // Splash Page
            var createSplashLoading = function(){
                // 
                App.Views.SplashLoading = new RenderController({
                    inTransition: false // want to immediately show our splash image
                });
                // Splash image same as image used in cordova
                App.Views.SplashLoading.Image = new ImageSurface({
                    content: 'res/splash/splash.png',
                    size: [undefined, undefined]
                });

                App.Views.SplashLoading.show(App.Views.SplashLoading.Image);

                App.Functions.SplashAction = function(){
                    // No animation, but could have one!
                }

                // Only show the SplashLoading if on a device
                if(App.usePg){
                    App.MainView.add(Utils.usePlane('splashLoading')).add(App.Views.SplashLoading);
                }

            };
            createSplashLoading();


            // Main Popover (keeps PageView underneath)
            var createPopover = function(){
                // var that = this;
                App.Views.Popover = new Lightbox({
                    inTransition: false,
                    outTransition: false,
                });
                App.Views.Popover.hideIf = function(thisView){
                    if(App.Views.Popover.CurrentPopover === thisView || App.Views.Popover.CurrentPopover === false){
                        App.Views.Popover.hide();
                    }
                };
                App.MainView.add(Utils.usePlane('popover')).add(App.Views.Popover);

            };
            createPopover();


            // Add ToastController to mainContext
            // - it should be a ViewSequence or something that allows multiple 'toasts' to be displayed at once, with animations)
            // - todo
            var toastNode = new RenderNode();
            App.MainView.add(Utils.usePlane('toast')).add(toastNode);

            // Add FPS Surface to mainContext
            var fps = new View();
            fps.Surface = new Surface({
                content: 'fps',
                size: [12,12],
                classes: ['fps-counter-default']
            });
            fps.Mod = new StateModifier({
                opacity: 0,
                origin: [1,1]
            });
            Timer.setInterval(function(){
                var fpsNum = parseInt(Engine.getFPS(), 10);
                var thresh = App.Credentials.fps_threshold;
                if(fpsNum >= thresh){
                    fps.Mod.setOpacity(0);
                }
                if(fpsNum < thresh && App.Credentials.show_fps){
                    fps.Mod.setOpacity(1);
                }

                fps.Surface.setContent(fpsNum);
            },1000);
            fps.add(fps.Mod).add(fps.Surface);
            App.MainView.add(Utils.usePlane('fps')).add(fps);

            // Test login
            $.ajaxSetup({
                cache: false,
                contentType: 'application/json', // need to do JSON.stringify() every .data in an $.ajax!
                statusCode: {
                    401: function(){
                        // Redirect the to the login page.
                        // alert(401);
                        // window.location.replace('/#login');
                     
                    },
                    403: function() {
                        // alert(403);
                        // 403 -- Access denied
                        // window.location.replace('/#denied');
                        App.Data.User.clear();
                    },
                    404: function() {
                        // alert(404);
                        // 403 -- Access denied
                        // window.location.replace('/#denied');
                    },
                    500: function() {
                        // alert(500);
                        // 403 -- Access denied
                        // window.location.replace('/#denied');
                    }
                }
            });

    
            // Hide device splash screen, start our splash screen animation
            App.Functions.SplashAction();
            App.BackboneEvents.once('page-show', function(){
                Timer.setTimeout(function(){
                    if(App.usePg){
                        navigator.splashscreen.hide();
                    }
                    Timer.setTimeout(function(){
                        App.Views.SplashLoading.hide();
                    },500);
                },100);
            });





            // Setup user
            // - includes AJAX setup (if necessary)
            // - data stored locally, use that (but trigger an update)
            // - local data invalid, goto Landing page
            App.Data.User = new UserModel.User();
            

            // Get access_token if it exists
            var oauthParams = Utils.getOAuthParamsInUrl();

            // Browser-only auth (has access_token in URL)
            if(typeof oauthParams.access_token == "string"){

                // Have an access_token
                // - save it to localStorage
                Utils.Storage.set(App.Credentials.prefix_access_token + 'user_identifier', oauthParams.user_identifier, 'critical');
                Utils.Storage.set(App.Credentials.prefix_access_token + 'access_token', oauthParams.access_token, 'critical');

                // Save
                App.Events.trigger('saveAppDataStore',true);

                // Reload page, back to #
                window.location = [location.protocol, '//', location.host, location.pathname].join('');
                return;
            }

            // // Begin at the begining of the application
            // // - router_hash: ""
            // // with "silent:true" we need to trigger a router to run at some point, otherwise no route is followed by default
            // Backbone.history.start({silent: true}); 
            // Backbone.history.navigate('',{trigger: false}); // not actually triggering the route, just "reseting"



            // Start the navigation/router
            var startRouter = function(){
                console.info('StartRouter');
                App.StartRouter = new App.Router.DefaultRouter();

                // Start history watching
                // - don't initiate based on the first view, always restart
                var initialUrl = false;
                if(window.location.hash.toString() != ''){
                    // Skip goto Home 
                    initialUrl = window.location.hash.toString();
                }
                Backbone.history.start({silent: true});
                Backbone.history.navigate('',{trigger: false, replace: true});
                initialUrl = initialUrl ? initialUrl : App.Credentials.home_route;

                // Logged in?
                // - determiens initial path
                // - home_route/initialUrl
                if(App.Data.user_identifier){
                    App.history.navigate(initialUrl);
                } else {
                    App.history.navigate('landing');
                }
            };

            // No "User" Model for Emailbox!!!

            // Get user and set to App global
            Utils.Storage.get(App.Credentials.prefix_access_token + 'user_identifier', 'critical')
                .then(function(user_identifier){
                    App.Data.user_identifier = user_identifier;

                    // Get access_token, set to App global
                    // - login to server (doesn't allow offline access yet)
                    // - switch to be agnostic to online state (if logged in, let access offline stored data: need better storage/sync mechanisms)
                    Utils.Storage.get(App.Credentials.prefix_access_token + 'access_token', 'critical')
                        .then(function(access_token){

                            console.log('Stored access_token:' + access_token); 

                            // Make available to requests
                            App.Data.access_token = access_token;

                            // Have a valid access token?
                            if(typeof App.Data.access_token != 'string' || App.Data.access_token.length < 1){
                                startRouter();
                                return;
                            }

                            // Validate credentials with mailstats server and emailbox 
                            // - make an api request to load my email address

                            // Logged in on server
                            App.Data.LoggedIn = true;

                            // Preload models
                            PreloadModels(App);

                            // Start api listener
                            // socket.io
                            Api.Event.start_listening();

                            // Load login
                            // Api.Event.start_listening();
                            startRouter();

                        });

                });





            // // Ajax setup for users
            // var localUser = localStorage.getItem(App.Credentials.local_user_key);
            // App.Data.User = new UserModel.User();

            // localUser = JSON.parse(localUser);
            
            // // Set User model to our locally-stored values
            // App.Data.User.set(localUser);
            // console.log(App.Data.User);

            // // Set up ajax credentials for later calls using this user
            // App.Data.UserToken = localStorage.getItem(App.Credentials.local_token_key);
            // $.ajaxSetup({
            //     headers: {
            //         'x-token' : App.Data.UserToken
            //     }
            // });

            // // Set up websocket token
            // App.Data.UserWebsocketToken = localStorage.getItem(App.Credentials.local_token_key + '_websocket');

            // // Initiate websockets
            // Utils.Websocket.init();
            
            // // Redirect after setting ajax credentials
            // if(localUser && !initialUrl){
            //     // Navigate to my Profiles page
            //     Timer.setTimeout(function(){
            //         App.Views.MainFooter.Tabs.select('home');
            //         // App.history.navigate('user/sentence');
            //     }, 100);
            // }

            // // Preload models
            // PreloadModels(App);

            // // Fetch
            // App.Data.User.fetch({
            //     statusCode: {
            //         403: function(){

            //             // Logout
            //             // - if not already at the login page
            //             // - and if data is already clear
            //             if(!localUser){
            //                 App.history.navigate('landing');
            //                 return;   
            //             }

            //             console.log(window.location.hash);
            //             if(window.location.hash.indexOf('random') != -1){
            //                 App.history.navigate(App.Credentials.home_route);
            //                 return;
            //             }

            //             if(window.location.hash != '#login' && window.location.hash != '#logout'){
            //                 App.history.navigate('logout/force');
            //             }

            //         }
            //     },
            //     error: function(err){
            //         console.error('failed login');
            //         console.error(err);

            //         Utils.Notification.Toast('Failed initial login');
            //         App.history.navigate('logout/force');

            //         // Utils.Notification.Toast('Failed login');
            //         // App.history.navigate('logout/force');
            //         // App.history.navigate('');
            //     },
            //     success: function(){
            //         // Resolve deferred (in case anyone is listening)
            //         // Store credentials

            //         // Update localStorage
            //         localStorage.setItem(App.Credentials.local_user_key, JSON.stringify(App.Data.User.toJSON()));

            //     }
            // });
    
            // // Start the navigation/router
            // console.info('StartRouter');
            // App.StartRouter = new App.Router.DefaultRouter();

            // // Start history watching
            // // - don't initiate based on the first view, always restart
            // var initialUrl = false;
            // if(window.location.hash.toString() != ''){
            //     // Skip goto Home 
            //     initialUrl = window.location.hash.toString();
            // }
            // Backbone.history.start({silent: true});
            // Backbone.history.navigate('',{trigger: false, replace: true});
            // initialUrl = initialUrl ? initialUrl : App.Credentials.home_route;

            // // Logged in?
            // // - determiens initial path
            // // - home_route/initialUrl
            // if(localUser){
            //     App.history.navigate(initialUrl);
            // } else {
            //     App.history.navigate('landing');
            // }
            


        });
    });


});
