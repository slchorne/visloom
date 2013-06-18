// ---------------------------
/*
    [ ] change the convergence and iterations

*/
// ---------------------------

// setup the GLOBALS

var MAXNODES = 30 ;
var jsonData ;

var width = 600,
    height = 400;

// scaling function for the viewport
var viewX = d3.scale.linear().range([0, width]),
    viewY = d3.scale.linear().range([height, 0]);

var color = d3.scale.category10();

var force ;

/*
*/

var svg,
    svgNodes,
    svgLinks;

// ---------------------------
var myController = {
    // state handler for the various draw modes
    update: function() {

        myGraph.init();
        myGraph.setNodes( jsonData.nodes );

        myGraph.addNodes( this.getGroupNodes( jsonData ) );

        myGraph.setLinks( this.getGroupLinks( jsonData ) );

        //
        // initialise, draw something
        //
        redrawSVG();

    },

    // --------------------------
    // model functions, these should be part of the json model
    indexHostTypes: function( json ) {
        // generate an index of all the unique host types
        // [ ] this should be part of the json model
        json.types = {};
        json.hosts.forEach(function(d, i) {
            if ( ! json.types[d.type] ) {
                json.types[d.type] = 1;
            }
            else {
                json.types[d.type]++ ;
            }
        });
        return 1 ;
    },

    getGroupNodes: function( json ) {
        // return an array of nodes that are the unique groups
        var gnodes = [] ;
        // then add them as nodes
        Object.keys(json.types).forEach(function(k, i) {
            gnodes.push({
                id: k,
                name: k + " - " + json.types[k],
                type: k,
                nodetype: 'root'
            });
        });

        return gnodes ;
    },

    getGroupLinks: function( json ) {
        // return an array of links from a host to their group
        var glinks = [ ];

        // now walk each of the hosts array
        // and create links to their parent node
        if ( json.hosts.length < MAXNODES ) {

            json.hosts.forEach(function(d, i) {
                glinks.push({
                    src: d.id,
                    dst: d.type
                });
            });

        }

        return glinks ;
    },

    // --------------------------

    setNodesToHosts: function( json ) {
        console.log ( "Setting nodes to hosts");

        // [ ] why do we do this here???
        this.indexHostTypes( json );  

        if ( json.hosts.length < MAXNODES ) {
            myGraph.setNodes( json.hosts );
        }
        else {
            myGraph.setNodes({
                "id": "summ", 
                "name": json.hosts.length + " hosts",
                "type": "summary", 
                 "ovs": ""
            });
        }

        return 1;
    },

    setNodestoHostandGroups: function( json ) {
        console.log ( "Setting nodes to hosts and Groups");
        this.setNodesToHosts(json);
    }

};

// ---------------------------
// ---------------------------
// view object for better handling of globals
var myGraph = {

    // variables
    // we use methods here to modify the nodex|links lists
    // so we never lose the original ref to these arrays
    nodes: [],
    links: [],

    nodeIndex: { f: 'aa' },
    isInitialised: 0,
    d3Layout: {},
    svgView:{},

    // scaling function for the viewport
    // [ ] where to set width
    viewX: d3.scale.linear().range([0, width]),
    viewY: d3.scale.linear().range([height, 0]),

    color: d3.scale.category10(),

    // methods
    getView: function(){ 
        return this.svgView 
    },
    setView: function( v ){
        this.svgView = v;
    },

    init: function(){
        if ( this.isInitialised ) {
            return ;
        }
        this.isInitialised = 1 ;

        // deal with namespace popping
        var myG = this ;

        console.log ( "mygraph init" );

        this.d3Layout = d3.layout.force()
            // point to the JSON dataset
            .nodes(this.nodes)
            .links(this.links)
            .charge(-200)
            .linkDistance(90)
            .size([width, height])
            // the tick method creates the layout, so it needs to return the
            // nodes and link info, see below
            .on("tick", tick);

        /*
        force = d3.sankey()
            .size([width, height])
            .nodes(this.nodes)
            .links(this.links)
            .layout(32)
        */
            

        var lsvg = d3.select("body").append("svg")
            .attr("width", width)
            .attr("height", height);

        lsvg.append("text")
            .attr("x", function(d) { return myG.viewX(.05); })
            .attr("y", function(d) { return myG.viewX(.07); })
            .text("Hosts");

        lnodes = lsvg.selectAll(".node");
        llinks = lsvg.selectAll(".link");

        this.setView({
            svg: lsvg,
            links: llinks,
            nodes: lnodes
        });

    },

    redraw: function(){

        console.log ( "mygraph redraw", myGraph );

        // redraw the graph based on our data
        var snodes = this.getView().nodes; 
        var slinks = this.getView().links; 

        var svgLinks = this.getView().links;

        // set the data for the list of nodes
        snodes = snodes.data(this.d3Layout.nodes(), 
            function(d) { return d.id;});

        // hang everything off a 'g.node'
        snodes.enter()
            .append("g")
            .attr("class","node")
            .call(this.d3Layout.drag)

        snodes
            .append("circle")
            .attr("class", function(d) { 
                return "node " + d.type; })
            .attr("r", function(d) {
                return getClassSize(d) });

        snodes
            .append("text")
                // offset
                .attr("dx", function(d) {
                    return getClassSize(d) + 4 })
                .attr("class","nodelabel")
                .text(function(d) { 
                    //return "foo"; });
                    return d.name; });

        snodes.exit().remove();

        myGraph.getView().nodes = snodes ;

    //--------------

        return ;

    //--------------


        slinks = slinks.data(this.d3Layout.links(), 
            // this is a function that will return a REF to the object
            //function(d){} );
            function(d) { 
                return d.source.id + "-" + d.target.id; }
            );

       
        // set up enter and exit rules
        slinks.enter().insert("line", ".node").attr("class", "link");
        slinks.exit().remove();

        /*
            ARROWHEADS??
        slinks    
            .append("svg:marker")
            .attr("id", String)
            .attr("class", "link")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", -1.5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("svg:path")
            .attr("d", "M0,-5L10,0L0,5");
        */

        // we've moved where this ref points to,
        // so we need to update it 
        myGraph.getView().links = snodes ;

        this.d3Layout.start();
    },

    // helper methods
    setNodes: function(n){
        this.nodes.length = 0 ;
        this.nodes.push.apply( this.nodes , n );

        // [ ] do we need to reindex ?
        //this.reindexLinks();
    },
    addNodes: function(n){
        //adding nodes should not require reindexing the links
        this.nodes.push.apply( this.nodes , n );
    },

    setLinks: function(l) {
        this.links.length = 0 ;
        this.links.push.apply( this.links , l );

        this.reindexLinks();

    },
    addLinks: function(){
        // just add a link array, but don't index
    },
    addAndIndexLinks: function(){
        // add them and reindex on the fly
        // assumes the nodes link is OK
        
        // [ ] error if the nodes do not exist
        // [ ] don't create the link
    },

    reindexNodes: function(){
        // index the nodes by 'id'

        // use a localvar to getaround 'this' popping
        var ni = {} ;
        this.nodes.forEach(function(d, i) {
            ni[d.id] = d;
        });

        this.nodeIndex = ni ;
    },

    reindexLinks: function(){
        // links are ALWAYS refs to a node ID, in this APP,

        // but D3 wants a link to point to an ARRAY index (buggy)
        // or a var/ref to an actual node object.

        // as the node array is always changing, the safe thing to do
        // is, after we've built the node array, wak the link array
        // and compile in refs to the actual nodes

        // WARNING: This will get unwieldy with large datasets
        // we should find a way to pop and push links instead

        this.reindexNodes();

        // use a localvar to getaround 'this' popping
        var ni = this.nodeIndex ;

        // now walk the links array and insert refs to the nodes
        // force.links uses 'd.source' and 'd.target'
        this.links.forEach(function(d, i) {
          d.source = ni[d.src];
          d.target = ni[d.dst];
        });

    }
};

// ---------------------------
// insert additional data after some time
// animate!!
/*
setTimeout(function() {
    console.log( "more data");
    var h = {
        "id": "r1", "name": "www-dev", "type": "http", 
                     "ovs": "s01", "port": "02"
    };

    jsonData.hosts.push(h);
    jsonData.nodes.push(h);
    //getGroupLinks( jsonData );
    //reindexLinks( jsonData );

    redrawSVG();
},4000);
*/

// ---------------------------
// set up input event handlers

var bod = d3.select("body");
var nextCounter = 0 ;
bod.on( 'click' , function(e) {
    nextData();
});
bod.on( 'keypress' , function(e) {
    nextData();
});

function nextData() {
    console.log ( 'click' , nextCounter );

    var legend = d3.select("text");

    if ( ! nextCounter ) {
        console.log( "Groups" );
        legend.text( "Hosts + Groups" );

        // now we index the array and re-compile the links
        getGroupLinks( jsonData );
        reindexLinks( jsonData );

        //console.log( jsonData );

        // redraw
        redrawSVG();
        nextCounter ++ ;
    }
    else if ( nextCounter === 1 ) {
        // nodes to a switch
        legend.text( "Hosts + Switches" );
        console.log( "Switches" );

        getSwitchLinks( jsonData );
        reindexLinks( jsonData );

        redrawSVG();
        nextCounter ++ ;
    }
    else if ( nextCounter === 2 ) {
        // switch interconnects
        legend.text( "Switches + Uplinks" );
        console.log( "uplinks" );

        getSwitchInterconnects( jsonData );
        reindexLinks( jsonData );

        redrawSVG();
        nextCounter ++ ;
    }
    else if ( nextCounter === 3 ) {
        // flows
        legend.text( "Hosts + Flows" );
        console.log( "flows" );

        getHostFlows( jsonData );
        reindexLinks( jsonData );

        redrawSVG();
        nextCounter ++ ;
    }
    else {
        // loop/reset
        console.log( "reset" );

        setNodesToHosts( jsonData );
        reindexLinks( jsonData );

        redrawSVG();
        nextCounter = 0 ;
    }



    // [ ] flows

}

// ---------------------------
//
// load a dataset from an AJAX call, thus we have to set up
// a callback that everything else gets called from
// (we can't do anything unless we load the json data
//       d3.json( file , callback() );

var infile = "loom.json" ;
//var infile = "loom-large.json" ;
d3.json( infile , initData );

// ---------------------------
//
function initData( json ) {
    // called once we load the json
    console.log ( "initial json load" );
    //

    jsonData = readData( json );

    if ( jsonData ) {

        myController.update();

    }
}

function getHostFlows( json ) {

    // we have to assume the node list is undefined,
    // but the host list is something we can work from

    if ( json.hosts.length > MAXNODES ) {
        // we need a summary by group
        getGroupLinks( json );

        // and we need a host lookup index
        reindexHosts( json );

        //console.log ( "hix" , json.hostIndex );

        // so we can create a summary index of flows
        var flowIndex = {};
        json.flows.forEach(function(d, i) {
            // find the source and dst type
            // and summarise flows by type

            var st,dt
            if ( json.hostIndex[d.src] ) {
                st= json.hostIndex[d.src].type
            }
            else {
                console.log ( "Bad f src" , d );
            }
            if ( json.hostIndex[d.dst] ) {
                dt= json.hostIndex[d.dst].type
            }
            else {
                console.log ( "Bad f dst" , d );
            }

            //console.log ( "new flow : " , st , dt );

            if ( st && dt ) {
                if ( ! flowIndex[st] ) {
                    flowIndex[st] = {}
                }
                flowIndex[st][dt]=1;
            }

        });

        // console.log( 'fix' , flowIndex );

        // now walk the flow summaries
        Object.keys(flowIndex).forEach(function(k, i) {
            var fs = k;
            Object.keys(flowIndex[fs]).forEach(function(k, i) {
                var fd = k;

                //console.log ( "add flow : " , fs , fd );

                if ( ! ( fs === fd ) ) {
                    json.links.push({
                        src: fs,
                        dst: fd
                    });
                }
            });
        });

    }
    else {
        setNodesToHosts( json );
        json.links.push.apply( json.links , json.flows );
    }

    return 1;
}

function getSwitchInterconnects( json ) {

    // [ ] ADD, we don't reset!!
    // [ ] I should use an index to refs in the array...

    // add additional links showing the interconnects
    // [ ] assume the uplink array is preformatted
    json.links.push.apply( json.links , json.uplinks );

    return 1;
}

function getSwitchLinks( json ) {

    // reset the nodes array
    // [ ] I should use an index to refs in the array...

    setNodesToHosts( json );

    json.nodes.push.apply( json.nodes , json.switches );
    //json.nodes.push.apply( json.nodes , json.hosts );

    // and link hosts to switches
    //json.links.length = 0 ;
    if ( json.hosts.length < MAXNODES ) {
        json.hosts.forEach(function(d, i) {
            json.links.push({
                src: d.id,
                dst: d.ovs
            });
        });
    }

    //console.log ( 'gsl' , json );

    return 1;
}

function getGroupLinks( json ) {
    // list the host groups and link all VISIBLE hosts
    // to the groups

    // we can't change where the link array points, so we have to
    // manipulate it from here

    // reset the data
    setNodesToHosts( json );

    json.nodes.push.apply( json.nodes , getGroupNodes(json) );

    // now walk each of the hosts array
    // and create links to their parent node
    if ( json.hosts.length < MAXNODES ) {
        json.hosts.forEach(function(d, i) {
            json.links.push({
                src: d.id,
                dst: d.type
            });
        });
    }

    return 1 ;
}

function getGroupNodes( json ) {
    // return an array of nodes that are the unique groups
    var gnodes = [] ;
    // then add them as nodes
    Object.keys(json.types).forEach(function(k, i) {
        gnodes.push({
            id: k,
            name: k + " - " + json.types[k],
            type: k,
            nodetype: 'root'
        });
    });

    return gnodes ;
}

function setNodesToHosts( json ) {
    // this is usually the initial state
    // reset the data
    json.nodes.length = 0 ;
    json.links.length = 0 ;

    // get unique categories for each host type
    json.types = {};
    json.hosts.forEach(function(d, i) {
        if ( ! json.types[d.type] ) {
            json.types[d.type] = 1;
        }
        else {
            json.types[d.type]++ ;
        }
    });

    //console.log ( 'types' , json.types );

    // if we have too many hosts, we need to summarise, and don't report
    // hosts
    //  json.nodes.push.apply( json.nodes , getGroupNodes(json) );
    if ( json.hosts.length < MAXNODES ) {
        json.nodes.push.apply( json.nodes , json.hosts );
    }
    else {
        json.nodes.push({
            "id": "summ", 
            "name": json.hosts.length + " hosts",
            "type": "summary", 
             "ovs": ""
        });
    }

    return 1;
}

function readData( json ) {
    if ( ! json ) {
        console.warn( "json data is missing" );
        return ;
    }

    // compile the json data, 
    json.nodes = [ ];
    json.links = [ ];

    // add in some missing data
    json.switches.forEach(function(d, i) {
        d.nodetype = 'root';
    });

    setNodesToHosts( json );
    
    //console.log( json );

    return ( json );

}

function reindexHosts( json ) {

    // index the nodes by 'id'
    json.hostIndex = {};
    json.hosts.forEach(function(d, i) {
        json.hostIndex[d.id] = d;
    });

}

function reindexNodes( json ) {

    // index the nodes by 'id'
    json.nodeIndex = {};
    json.nodes.forEach(function(d, i) {
        json.nodeIndex[d.id] = d;
    });

}

function reindexLinks( json ) {

    // links are ALWAYS refs to a node ID, in thia APP,

    // but D3 wants a link to point to an ARRAY index (buggy)
    // or a var/ref to an actual node object.

    // as the node array is always changing, the safe thing to do
    // is, after we've built the node array, wak the link array
    // and compile in refs to the actual nodes

    // WARNING: This will get unwieldy with large datasets
    // we should find a way to pop and push links instead

    reindexNodes( json );

    // now walk the links array and insert refs to the nodes
    // force.links uses 'd.source' and 'd.target'
    json.links.forEach(function(d, i) {
      d.source = json.nodeIndex[d.src];
      d.target = json.nodeIndex[d.dst];
    });

}


// WARNING:..

// there is a problem here involving REFS, once you make a call to 
// d3.layout.force() all sorts of REFS to the links and nodes list get
// created and mesed with, so we have to create all these arrays
// BEFORE we make a call to force.links()

//-------------------

// and now we have Links[] and Nodes[] ready for use by D3::force...

// here is the guts of the operation
function redrawSVG() {

    // [ ] i need a functional collection of links to
    // test this correctly...

    console.log ( "redraw SVG" , myGraph );

    myGraph.redraw();
    //drawNodes();
    //return ;

    var svgLinks = myGraph.getView().links;
    var svgNodes = myGraph.getView().nodes;
    var force = myGraph.d3Layout;

    // and the links...
    svgLinks = svgLinks.data(force.links(), 
        // this is a function that will return a REF to the object
        //function(d){} );
        function(d) { 
            return d.source.id + "-" + d.target.id; }
        );

   
    // set up enter and exit rules
    svgLinks.enter().insert("line", ".node").attr("class", "link");
    svgLinks.exit().remove();

    /*
        ARROWHEADS??
    svgLinks    
        .append("svg:marker")
        .attr("id", String)
        .attr("class", "link")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");
    */

    // we've moved where this ref points to,
    // so we need to update it 
    //myGraph.getView().nodes = svgNodes ;

    myGraph.getView().links = svgLinks ;

    force.start();
}

function getClassSize(d) {
    // calculate a size based on an nodes class
    return d.nodetype === 'root' ? 16 : 8;
}

function tick() {
    // tick switches to it's own namespace, so we have to
    // find a way to get to the veriables we require
    // without reverting to a global namesspace

    var v = myGraph.getView();

    // since we now have a parent 'g' object on the circle
    // we use the transform() to move things around
    v.nodes
        .attr("transform", function(d) { 
            return "translate(" + d.x + "," + d.y + ")"; });

    /*
    svgNodes.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
      */

    /*
    */

    // [ ] uncomment this!!!
    v.links
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

}
