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
    var StandardHeader = require('views/common/StandardHeader');
    
    var EventHandler = require('famous/core/EventHandler');

    // Models
    var UserModel = require('models/user');

    // Custom Surface
    var TextAreaSurface = require('views/common/TextAreaSurface');


    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // User
        this.model = new UserModel.User();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: 0, //App.Defaults.Header.size,
            footerSize: 132
        });

        this.layout.Bg = new Surface({
            content: '',
            size: [undefined, undefined],
            classes: ['landing-page-bg-default']
        });

        // this.createHeader();
        this.createContent();
        this.createFooter();
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(Utils.usePlane('content',-1)).add(this.layout.Bg);
        this.add(Utils.usePlane('content',1)).add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;


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

        this.footer = new View();
        this.footer.SizeMod = new StateModifier({
            size: [undefined, undefined]
        });
        this.footer.SeqLayout = new SequentialLayout();
        this.footer.Views = [];

        // Sign Up button
        this.signupButton = new Surface({
            content: '<div class="lifted">Login with your Host</div>',
            size: [Utils.WindowWidth(), 60],
            classes: ['landing-button','silo-button']
        });
        this.signupButton.on('click', function(){
            // App.history.navigate('signup');
            that.login();
        });
        this.footer.Views.push(this.signupButton);

        // Login button/text
        this.loginButton = new Surface({
            content: 'Already have an account? <span>Log In</span>',
            size: [undefined, 60],
            classes: ['landing-login-button']
        });
        this.loginButton.on('click', function(){
            App.history.navigate('login');
        });
        // this.footer.Views.push(this.loginButton);

        this.footer.SeqLayout.sequenceFrom(this.footer.Views);

        this.footer.add(this.footer.SizeMod).add(this.footer.SeqLayout);
        // Attach header to the layout        
        this.layout.footer.add(this.footer);

    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        // Landing Page Title
        this.landingTitle = new View();
        this.landingTitle.OriginMod = new StateModifier({
            align: [0.5, 0.5],
            origin: [0.5,0.5]
        });
        this.landingTitle.Bg = new Surface({
            content: '',
            size: [undefined, 300],
            classes: ['landing-title-bg-gradient']
        });
        this.landingTitle.Surface = new Surface({
            content: '<div>Places</div><div>Where have you been?</div>',
            size: [undefined, 200],
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

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces
        // - add to scrollView
        this.inputEmailSurface = new InputSurface({
            name: 'email',
            placeholder: 'Email Address',
            type: 'email',
            size: [undefined, 50],
            value: ''
        });

        this.inputEmailSurface.View = new View();
        this.inputEmailSurface.View.StateModifier = new StateModifier();
        this.inputEmailSurface.View.add(this.inputEmailSurface.View.StateModifier).add(this.inputEmailSurface);
        this.contentScrollView.Views.push(this.inputEmailSurface.View);

        // Build Surfaces
        // - add to scrollView
        this.inputPasswordSurface = new InputSurface({
            name: 'password',
            placeholder: 'Password',
            type: 'password',
            size: [undefined, 50],
            value: ''
        });

        this.inputPasswordSurface.View = new View();
        this.inputPasswordSurface.View.StateModifier = new StateModifier();
        this.inputPasswordSurface.View.add(this.inputPasswordSurface.View.StateModifier).add(this.inputPasswordSurface);
        this.contentScrollView.Views.push(this.inputPasswordSurface.View);

        this.submitButtonSurface = new Surface({
            content: 'Sign Up',
            size: [undefined, 60],
            classes: ['form-button-submit-default']
        });
        this.submitButtonSurface.View = new View();
        this.submitButtonSurface.View.StateModifier = new StateModifier();
        this.submitButtonSurface.View.add(this.submitButtonSurface.View.StateModifier).add(this.submitButtonSurface);
        this.contentScrollView.Views.push(this.submitButtonSurface.View);

        // Events for surfaces
        this.submitButtonSurface.on('click', this.create_account.bind(this));


    };

    PageView.prototype.login = function(){

        // Start OAuth process
        var that = this;

        var p = {
            app_id : App.Credentials.app_key,
            callback : [location.protocol, '//', location.host, location.pathname].join('')
        };

        Utils.Popover.List({
            list: [{
                text: App.Credentials.base_api_url,
                success: function(opt){
                    runLogin(opt.text);
                }
            },{
                text: App.Credentials._base_api_url,
                success: function(opt){
                    runLogin(opt.text);
                }
            }]
        });

        var runLogin = function(baseUrl){

            if(App.Data.usePg){
                
                var p = {
                    response_type: 'token', // token = "#", code = "?"
                    client_id : App.Credentials.app_key,
                    redirect_uri : baseUrl + 'testback'
                };
                var params = $.param(p);
                var call_url = baseUrl + "apps/authorize/?" + params;

                var ref = window.open(call_url, '_blank', 'location=yes');
                ref.addEventListener('loadstart', function(event) { 
                    
                    // var url = Utils.parseUrl(e.url);
                    // if(url.hash == '#exit'){
                    //     ref.close();
                    // }

                    // event.url;
                    var tmp_url = event.url;

                    console.log(tmp_url);

                    var parser = document.createElement('a');
                    parser.href = tmp_url;

                    if(parser.pathname.substr(0,9) == '/testback'){
                        
                        // window.plugins.childBrowser.close();
                        // alert('closing childbrowser after /testback');
                        // return false;
                        // alert('testback');

                        // url-decode
                        // alert(tmp_url);
                        var url = decodeURIComponent(tmp_url);
                        // alert(url);

                        // var qs = App.Utils.getUrlVars();
                        var oauthParams = Utils.getOAuthParamsInUrl(url);
                        // alert(JSON.stringify(oauthParams));

                        // if(typeof qs.user_token == "string"){
                        if(typeof oauthParams.access_token == "string"){

                            // Have an access_token
                            // - save it to localStorage

                            // App.Utils.Storage.set(App.Credentials.prefix_access_token + 'user', oauthParams.user_identifier);
                            // App.Utils.Storage.set(App.Credentials.prefix_access_token + 'access_token', oauthParams.access_token);

                            Utils.Storage.set(App.Credentials.prefix_access_token + 'user_identifier', oauthParams.user_identifier, 'critical')
                                .then(function(){
                                    // Saved user!
                                    // alert('saved user');
                                });

                            Utils.Storage.set(App.Credentials.prefix_access_token + 'access_token', oauthParams.access_token, 'critical')
                                .then(function(){
                                    
                                    // Reload page, back to #home
                                    // forge.logging.info('reloading');

                                    // alert('success');
                                    // window.plugins.childBrowser.close();

                                    // Emit save event (write file)
                                    App.Events.trigger('FileSave',true);
                                    ref.close();


                                    // // Reload page, back to #home
                                    // window.location = [location.protocol, '//', location.host, location.pathname].join('');
                                    $('body').html('Loading');

                                    // Reload page, back to #home
                                    window.setTimeout(function(){
                                        window.location = [location.protocol, '//', location.host, location.pathname].join('');
                                    },500);
                                });

                        } else {
                            // Show login splash screen
                            var page = new App.Views.BodyLogin();
                            App.router.showView('bodylogin',page);

                            alert('Problem logging in');
                            // window.plugins.childBrowser.close();
                            ref.close();

                        }

                        return;

                    }

                    return;

                });
                // ref.addEventListener('loadstop', function(event) { alert('stop: ' + event.url); });
                ref.addEventListener('loaderror', function(event) { console.error('Uh Oh, encountered an error: ' + event.message); });
                // ref.addEventListener('exit', function(event) { alert('exit1');alert(event.type); });

            } else {

                var p = {
                    response_type: 'token',
                    client_id : App.Credentials.app_key,
                    redirect_uri : [location.protocol, '//', location.host, location.pathname].join('')
                };
                var params = $.param(p);
                window.location = baseUrl + "apps/authorize/?" + params;

            }
        }

        return false;


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

                            // Slide content left
                            that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0), transitionOptions.outTransition);

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

                        // Content
                        // - extra delay for other content to be gone
                        Timer.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0),transitionOptions.inTransition);

                            // // Bring in button surfaces individually
                            // that.contentScrollView.Views.forEach(function(surf, index){
                            //     Timer.setTimeout(function(){
                            //         surf.StateModifier.setTransform(Transform.translate(0,0,0), {
                            //             duration: 250,
                            //             curve: Easing.easeOut
                            //         });
                            //     }, index * 50);
                            // });

                        }, delayShowing); // + transitionOptions.outTransition.duration);

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


