// ---------------------------

// setup the GLOBALS

var width = 600,
    height = 400;

// scaling functions for the viewport
var viewX = d3.scale.linear().range([0, width]),
    viewY = d3.scale.linear().range([height, 0]);

var color = d3.scale.category10();

var force ;
var svg,
    svgNodes,
    svgLinks;

var jsonData ;


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

        getHostsOnly( jsonData );
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
d3.json( infile , initData );

// ---------------------------
//
function initData( json ) {
    // called once we load the json
    console.log ( "initial json load" );
    //

    jsonData = readData( json );

    if ( jsonData ) {
        initD3( jsonData );
    }
}

function getHostFlows( json ) {

    json.nodes.length = 0 ;
    json.links.length = 0 ;

    json.nodes.push.apply( json.nodes , json.hosts );
    json.links.push.apply( json.links , json.flows );

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

    json.nodes.length = 0 ;
    json.nodes.push.apply( json.nodes , json.hosts );
    json.nodes.push.apply( json.nodes , json.switches );

    // and link hosts to switches
    json.links.length = 0 ;
    json.hosts.forEach(function(d, i) {
        json.links.push({
            src: d.id,
            dst: d.switch
        });
    });

    //console.log ( 'gsl' , json );

    return 1;
}

function getHostsOnly( json ) {
    // reset the data
    json.nodes.length = 0 ;
    json.links.length = 0 ;

    json.nodes.push.apply( json.nodes , json.hosts );

    return 1;
}

function getGroupLinks( json ) {

    // we can't change where the link array points, so we have to
    // manipulate it from here

    // reset the data
    json.nodes.length = 0 ;
    json.links.length = 0 ;

    json.nodes.push.apply( json.nodes , json.hosts );
    json.nodes.push.apply( json.nodes , getGroupNodes(json) );

    // now walk each of the hosts array
    // and create links to their parent node
    json.hosts.forEach(function(d, i) {
        json.links.push({
            src: d.id,
            dst: d.type
        });
    });

    return 1 ;
}

function getGroupNodes( json ) {
    // return an array of nodes that are the unique groups
    var gnodes = [] ;
    // then add them as nodes
    Object.keys(json.types).forEach(function(k, i) {
        gnodes.push({
            id: k,
            name: k,
            type: k,
            class: 'root'
        });
    });

    return gnodes ;
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
        d.class = 'root';
    });
    
    // get unique categories for each host type
    json.types = {};
    json.hosts.forEach(function(d, i) {
        json.types[d.type] = d.type ;
    });

    // then add them as nodes
    json.nodes.push.apply( json.nodes , json.hosts );
    //json.nodes.push.apply( json.nodes , getGroupNodes(json) );


    // if you were setting links initially, you'd do it here
    //getGroupLinks( json );
    //reindexLinks( json );

    //console.log( json );

    return ( json );

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

    // index the nodes by 'id'
    var nodeIndex = {};
    json.nodes.forEach(function(d, i) {
        nodeIndex[d.id] = d;
    });

    // now walk the links array and insert refs to the nodes
    // force.links uses 'd.source' and 'd.target'
    json.links.forEach(function(d, i) {
      d.source = nodeIndex[d.src];
      d.target = nodeIndex[d.dst];
    });

}


// WARNING:..

// there is a problem here involving REFS, once you make a call to 
// d3.layout.force() all sorts of REFS to the links and nodes list get
// created and mesed with, so we have to create all these arrays
// BEFORE we make a call to force.links()

// initD3();

// ---------------------------

function initD3( json ) {
    // setup the d3 SVG stuff
    if ( ! json ) {
        console.warn( "json data is corrupt" );
        return ;
    }

    // warning globals...

    force = d3.layout.force()
        // point to the JSON dataset
        .nodes(json.nodes)
        .links(json.links)
        .charge(-400)
        .linkDistance(120)
        .size([width, height])
        // the tick method creates the layout, so it needs to return the
        // nodes and link info, see below
        .on("tick", tick);

    /*
    force = d3.sankey()
        .size([width, height])
        .nodes(json.nodes)
        .links(json.links)
        .layout(32)
    */
        

    svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.append("text")
        .attr("x", function(d) { return viewX(.05); })
        .attr("y", function(d) { return viewX(.07); })
        .text("Hosts");

    svgNodes = svg.selectAll(".node");
    svgLinks = svg.selectAll(".link");

    //
    // initialise, draw something
    //

    redrawSVG();
}

//-------------------

// and now we have Links[] and Nodes[] ready for use by D3::force...

// here is the guts of the operation
function redrawSVG() {

    svgLinks = svgLinks.data(force.links(), 
        // this is a function that will return a REF to the object
        //function(d){} );
        function(d) { 
            return d.source.id + "-" + d.target.id; }
        );

   
    // set up enter and exit rules
    svgLinks.enter().insert("line", ".node").attr("class", "link");
    svgLinks.exit().remove();

    // set the data for the list of nodes
    svgNodes = svgNodes.data(force.nodes(), function(d) { return d.id;});

    // hang everything off a 'g.node'
    /*
    */
    svgNodes.enter()
        .append("g")
        .attr("class","node")
        .call(force.drag)

    /*
        ARROWHEADS??

    svgNodes    
        .append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");
    */

    svgNodes
        .append("circle")
        .attr("class", function(d) { 
            return "node " + d.type; })
        .attr("r", function(d) {
            return getClassSize(d) });

        /*
            for mousoevers append("title")
        */
    svgNodes
        .append("text")
            // offset
            .attr("dx", function(d) {
                return getClassSize(d) + 4 })
            .attr("class","nodelabel")
            .text(function(d) { 
                //return "foo"; });
                return d.name; });


    svgNodes.exit().remove();

    force.start();
}

function getClassSize(d) {
    // calculate a size based on an nodes class
    return d.class === 'root' ? 16 : 8;
}

function tick() {
    // since we now have a parent 'g' object on the circle
    // we use the transform() to move things around

    svgNodes
        .attr("transform", function(d) { 
            return "translate(" + d.x + "," + d.y + ")"; });

    /*
    svgNodes.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
      */

    svgLinks
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
}
