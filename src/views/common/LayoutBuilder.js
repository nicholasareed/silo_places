define(function(require, exports, module) {


    var Scene = require('famous/core/Scene');
    var Surface = require('famous/core/Surface');
    var ElementOutput = require('famous/core/ElementOutput');
    var RenderNode = require('famous/core/RenderNode');
    var Transform = require('famous/core/Transform');
    var View = require('famous/core/View');

    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');

    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var TextareaSurface = require('famous/surfaces/TextareaSurface');
    var SubmitInputSurface = require('famous/surfaces/SubmitInputSurface');

    var ContainerSurface = require('famous/surfaces/ContainerSurface');
    var FormContainerSurface = require('famous/surfaces/FormContainerSurface');

    var Timer = require('famous/utilities/Timer');
    var Utils = require('utils');

    var RenderController = require('famous/views/RenderController');
    var GridLayout = require('famous/views/GridLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var ScrollView = require('famous/views/Scrollview');

    var $ = require('jquery');
    var _ = require('underscore');
    var tinycolor           = require('lib2/tinycolor');
    var spectrum            = require('lib2/spectrum');

    var BoxLayout = require('famous-boxlayout');

    function LayoutBuilder(options) {
        var that = this;
        View.apply(this, arguments);

        // accepts a dictionary and returns a built layout
        // - expectecting references/names for all items passed in (Surfaces, etc.)

        // Size modifier?
        // - wrap in a rendernode
        // - if String, then using a Modifier function

        var node; // the RenderNode (with size modifier) that gets returned!
        var returnNode; // node that
        var originalNode; // node of the actual element we're using (Surface, SequentialLayout, etc.)
        var name;

        var result;

        var sizeMod = options.size;

        // maybe passing in a famous-like element already?, that just needs a name?

        // "extract" out the keys we might want to use

        // What type are we going to use?
        if(options.surface){
            // EXPECTING a title/key to be here
            name = 'surface';
            var originalNode = this.createSurface(options.surface);
            // returnNode = tmpSurfaceNode[0];
            // originalNode = tmpSurfaceNode[1];
            // name = tmpSurfaceNode[0];

        } else if(options.flexible){
            name = 'flexible';
            originalNode = this.createFlexibleLayout(options.flexible);
            // originalNode = result[0];
            // returnNode = result[1];

        } else if(options.sequential){
            name = 'sequential';
            originalNode = this.createSequentialLayout(options.sequential);
            // originalNode = result[0];
            // returnNode = result[1];
        } else if(options.scroller){
            name = 'scroller';
            originalNode = this.createScrollviewLayout(options.scroller);
            // originalNode = result[0];
            // returnNode = result[1];

        } else if(options.flipper){

        } else if(options.grid){
            name = 'grid';
            originalNode = this.createGridLayout(options.grid);
            // originalNode = result[0];
            // returnNode = result[1];
        } else if(options.controller){
            // would be great to have an "unslot me if I'm hidden" type of option... (or support 0-height Views!!!!)
            name = 'controller';
            originalNode = this.createRenderController(options.controller);
            // originalNode = result[0];
            // returnNode = result[1];
        } else {
            console.error('missing type of Layout to build');
            console.log(options);
            debugger;
        }

        var nodeOptions = options[name];

        // Mods
        var moddedNode = this.buildModsForNode( originalNode, nodeOptions );

        // Margins
        var returnNode = this.buildMargins( moddedNode, nodeOptions);

        // Change name based on passed-in key
        // - no longer allow { Title: { surface: ... }} naming (only worked for Surfaces anyways)
        if(options[name].key){ // !options.surface && 
            name = options[name].key;
        }


        // Set the size of the contraining node/view
        // - can handle a bunch of passed-in sizes: functions, string, etc.

        if(sizeMod){
            if(sizeMod instanceof Function){
                node = new RenderNode(new Modifier({
                    size: sizeMod.bind(that)
                }));
            } else if(sizeMod instanceof String){
                // example??
                node = new RenderNode(new Modifier({
                    size: function(){
                        return returnNode.getSize();
                    }
                }));
            } else {
                node = new RenderNode(new Modifier({
                    size: function(){
                        var w = sizeMod[0],
                            h = sizeMod[1];
                        if(typeof sizeMod[0] == "string"){ // forgot why Strings are allowed... ("this" ?)
                            w = returnNode.getSize()[0];
                        }
                        if(typeof sizeMod[1] == "string"){
                            h = returnNode.getSize()[1];
                        }
                        // console.log(sizeMod, w, h, typeof sizeMod[1]);
                        return [w, h];
                    }
                }));
            }

        } else {
            // build our own size based on the element's getSize
            node = new RenderNode(new Modifier({
                size: function(val){
                    // console.log(returnNode);
                    // console.log(options);
                    return (returnNode && returnNode.getSize) ? returnNode.getSize(val) : [undefined, undefined];
                }
            }));
        }

        // Name/Key
        node[name] = originalNode ? originalNode : returnNode;
        node.hasName = name;

        // Plane
        if(options.plane){
            node.add(Utils.usePlane.apply(this,options.plane)).add(returnNode);
        } else {
            node.add(returnNode);
        }

        // More keys that can be triggered
        // - most used by surfaces (pipe, click, deploy, etc.)
        if(nodeOptions.pipe){
            if(typeof nodeOptions.pipe === typeof []){
                nodeOptions.pipe.forEach(function(pipeTo){
                    originalNode.pipe(pipeTo);
                });
            } else {
                originalNode.pipe(nodeOptions.pipe);
            }
        }
        if(nodeOptions.click){
            originalNode.on('click', nodeOptions.click);
        }
        if(nodeOptions.deploy){
            originalNode.on('deploy', nodeOptions.deploy);
        }
        if(nodeOptions.events){
            // Timer.setTimeout(function(){
                nodeOptions.events(originalNode);
            // },1);
        }

        this.node = node;
        return node;

    }

    LayoutBuilder.prototype = Object.create(View.prototype);
    LayoutBuilder.prototype.constructor = LayoutBuilder;

    LayoutBuilder.prototype.buildModsForNode = function(endNode,options){
        var that = this;


        if(!options.mods){
            return endNode;
        }

        if(!endNode.sizer){
            endNode.sizer = [];
        }

        endNode.mods = {};

        // mods can be added via the "mods:" obj, or through "size:" , "origin:" etc on the options obj

        var tmpRenderNode = new RenderNode();

        var nodeTmp = [];
        nodeTmp.push(tmpRenderNode);

        options.mods.forEach(function(modObj){

            // Creating a "sizer" mod?
            // - this creates a query-able surface (out of sight)
            // - used for centering
            if(modObj === 'sizer'){
                var tmpSurf  = new Surface({
                    content: '',
                    size: [undefined, undefined],
                    properties: {
                        // background: 'red'
                    }
                 });

                var x = new StateModifier({
                    transform: Transform.translate(0,-100000, -1000000) // moved way off-page
                });

                nodeTmp[nodeTmp.length - 1].add(x).add(tmpSurf)
                endNode.sizer.push(tmpSurf);
                return;
            }

            // Pull out the  key if it exists
            var key;
            if(modObj.key != undefined){
                key = modObj.key; // save key
                delete modObj.key; // remove from obj
            }

            // expecting an Object with keys like size,origin,align
            // - or a function, that works too
            var tmpMod = new Modifier(modObj);

            nodeTmp.push(nodeTmp[nodeTmp.length - 1].add(tmpMod));
            if(key){
                endNode.mods[key] = tmpMod;
            }
        });


        // node[name] = returnNode;
        nodeTmp[nodeTmp.length - 1].add(endNode);

        // Return the FIRST element in the chain, that has our thoroughly-modded endNode at the end
        return tmpRenderNode;
    };

    LayoutBuilder.prototype.buildMargins = function(endNode,options){
        var that = this;

        if(!options.margins){
            return endNode;
        }

        // Create the BoxLayout
        // - "middle" is either undefined or true (true by default)
        var boxLayout = new BoxLayout({ 
            margins: options.margins, 
            middle: options.marginsMiddle
        });

        // boxLayout.top.add(new Surface({
        //     content: '',
        //     properties: {
        //         backgroundColor: 'purple'
        //     }
        // }));
        // boxLayout.bottom.add(new Surface({
        //     content: '',
        //     properties: {
        //         backgroundColor: 'blue'
        //     }
        // }));
        
        boxLayout.middleAdd(endNode);

        return boxLayout;
    };

    LayoutBuilder.prototype.defaultSequenceFrom = function(options, Element, isRenderController){

        var tmp = Element;

        // sequenceFrom
        options.sequenceFrom.forEach(function(objs){

            var nodes = [];
            var tmpNode = new RenderNode();

            if(!(objs instanceof Array)){
                objs = [objs];
            }

            objs.forEach(function(obj){

                var objTempNode;

                if(obj instanceof ElementOutput ||
                   obj instanceof RenderNode ||
                   obj instanceof View ||
                   obj instanceof Surface){
                    objTempNode = obj;
                } else if((typeof obj).toLowerCase() == 'object'){
                    var objTempNode = new LayoutBuilder(obj);

                    if(objTempNode.hasName){
                        tmp[objTempNode.hasName] = objTempNode[objTempNode.hasName];
                        tmp[objTempNode.hasName].NodeWithMods = objTempNode;
                    } else {
                        // tmp[name] = objTempNode;
                        debugger;
                    }
                } else if(!obj){ 
                    // can ignore/skip some spots
                    return;
                } else {
                    console.error('unknown type');
                    debugger;
                }
                if(!isRenderController){
                    tmpNode.add(objTempNode);
                }
                nodes.push(objTempNode);
            });
        
            tmpNode.getSize = nodes[0].getSize.bind(nodes[0]);

            tmp.Views.push(tmpNode);
        });
    
        if(!isRenderController){
            tmp.sequenceFrom(tmp.Views);
        }

    };

    LayoutBuilder.prototype.createSurface = function(options){
        var that = this;

        // Name of the surface is acquired through a passed Key, or it looks like - Title: new Surface({...

        var originalNode = options.surface; // MUST be a RenderNode/Element/Surface,etc.

        return originalNode;

    };

    LayoutBuilder.prototype.createFlexibleLayout = function(options){
        var that = this;

        var tmp = new FlexibleLayout({
            direction: options.direction,
            ratios: options.ratios
        });
        tmp.Views = [];

        if(options.size){
            // Expecting a True in either one
            // - otherwise, returning undefined for h/w

            // Used for true Height or Width(v2) 
            // - only allowing horizontal direction for now
            var h,w;
            if(options.direction == 0 && options.size[1] === true){

                tmp.getSize = function(){

                    var useHeight = 0;

                    tmp.Views.forEach(function(v){
                        var h = 0;
                        try{
                            h = v.getSize(true)[1];
                        }catch(err){
                            console.log('nosize');
                        }
                        if(h > useHeight){
                            useHeight = h;
                        }
                    });

                    // check against passed minSize
                    if(options.minSize && (options.minSize[1] > useHeight)){
                        useHeight = options.minSize[1];
                    }

                    return [options.size[0], useHeight];
                }
                
            }
        }

        // sequenceFrom
        this.defaultSequenceFrom(options, tmp);

        return tmp;

    };

    LayoutBuilder.prototype.createSequentialLayout = function(options){
        var that = this;

        var tmp = new SequentialLayout({
            direction: options.direction === 0 ? 0 : 1
        });
        tmp.Views = [];

        if(options.size){
            // Expecting a True in either one
            // - otherwise, returning undefined for h/w

            // Used for true Height or Width(v2) 
            // - only allowing horizontal direction for now?
            var h,w;
            if(options.direction == 0 && options.size[1] === true){

                tmp.getSize = function(){

                    var useHeight = 0;

                    tmp.Views.forEach(function(v){
                        // console.log(v);
                        // console.log(v.getSize());
                        var h = 0;
                        try{
                            h = v.getSize(true)[1];
                        }catch(err){
                            console.log('nosize');
                        }
                        if(h > useHeight){
                            useHeight = h;
                        }
                    });

                    return [undefined, useHeight];
                }
                
            }
        }
        
        // sequenceFrom
        this.defaultSequenceFrom(options, tmp);

        return tmp;

    };

    LayoutBuilder.prototype.createScrollviewLayout = function(options){
        var that = this;

        var tmp = new ScrollView({
            direction: options.direction // 0,1
        });
        tmp.Views = [];

        // sequenceFrom
        this.defaultSequenceFrom(options, tmp);

        return tmp;

    };

    LayoutBuilder.prototype.createGridLayout = function(options){
        var that = this;

        var tmp = new GridLayout({
            dimensions: options.dimensions || [] // 3 col, 4 row
        });
        tmp.Views = [];

        if(options.size){
            // Expecting a True in either one
            // - otherwise, returning undefined for h/w

            // Used for true Height or Width(v2) 
            // - only calculating the Height at the moment
            var h,w;

            // Height
            if(options.size[1] === true){

                tmp.getSize = function(){
                    
                    var columnCount = options.dimensions[0];

                    // Uses the number of rows to determine the max-height of an individual column

                    var useHeights = _.map(_.range(columnCount), function(){return 0;}); // number of columns we're counting

                    tmp.Views.forEach(function(v,i){
                        var h = v.getSize(true)[1];
                        useHeights[columnCount%(i+1)] += h;
                        // if(h > useHeight){
                        //     useHeight = h;
                        // }
                    });
                    
                    return [undefined, Math.max(useHeights)];
                }
                
            }

            // Width
            // - todo

        }

        // sequenceFrom
        this.defaultSequenceFrom(options, tmp);

        return tmp;

    };

    LayoutBuilder.prototype.createRenderController = function(options){
        var that = this;

        var tmp = new RenderController({
            showingSize: options.showingSize // turns a RenderController's size into [true, true]
        });
        tmp.Views = [];

        options.sequenceFrom = options.sequenceFrom || options.Views; // alias

        // sequenceFrom
        this.defaultSequenceFrom(options, tmp, true); // isRenderController=true

        // Default to select?
        if(options.default){
            var viewToShow = options.default(tmp);
            if(viewToShow){
                // Timer.setTimeout(function(){
                    tmp.show(viewToShow);
                // },1);
            }
        }

        return tmp;

    };

    LayoutBuilder.DEFAULT_OPTIONS = {
        
    };

    module.exports = LayoutBuilder;
});