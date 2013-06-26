// ---------------------------
/*

    [ ] tabular flow data:
        return columns.map ??
        http://jsfiddle.net/7WQjr/

    [ ] move the event handlers into the controller

    [ ] move the json data into a model
        [ ] we will want an EXT loader probably
        [ ] need add/remove functions to the datamodel


    [ ] append and mesh the nodes in the graph
        [ ] still funky for 'groups' ??

    [ ] move the code into erland

*/
// ---------------------------

// setup the GLOBALS

var MAXNODES = 30 ;
var jsonData ;
var infile = "loom.json" ;

// keeping this glpobal seems to help
var width = 600,
    height = 400;

// ---------------------------
// event handlers, they should be in the controller init method
// (if we had one )


//var bod = d3.select("body").select("#menu") ;
//var bod = d3.select("div.menuBlock") ;
//var bod = d3.select("body").select(".menuBlock") ;
var bod = d3.select("body");
/*
*/
bod.on( 'click' , function(e) {
    // find out what object we clicked on
    myController.setState( d3.event.srcElement.id );
    //console.log ( 'global', d3.event );
});
bod.on( 'keypress' , function(e) {
    if ( d3.event.keyCode === 106 ) {
        // 'j' key...
        reloadJson();
    }
    else {
        myController.setState();
    }
});

// ---------------------------
//
// try and just generate a table

function flowTable(data){
    var table = d3.select("body").append("table"),
        thead = table.append("thead"),
        tbody = table.append("tbody");

    //var data = flows ;
    var columns = [ 'ts','src','dst' ];

    // append the header row
    thead.append("tr")
        .selectAll("th")
        .data(columns)
        .enter()
        .append("th")
            .text(function(column) { return column; });

    // create a row for each object in the data
    var rows = tbody.selectAll("tr")
        .data(data)
        .enter()
        .append("tr");

    /*
    var rm = [];
    data.forEach(function(row) {
        // we're using the columns entries as hash keys
        // map turns an array into a named hash
        var ff = columns.map(function(column) {
            console.log( 'rm map' , column );

            return {column: column, value: row[column]};
        });
        console.log ( "return:",ff);
        rm.push( ff );
    });

    console.log( "rowmap" , rm );
    */

    // create a cell in each row for each column
    var cells = rows.selectAll("td")
        .data(function(row) {

            //console.log( 'in row' , row );

            // we're using the columns entries as hash keys
            return columns.map(function(column) {

                // console.log( 'in map' , column );

                return {column: column, value: row[column]};
            });
        })
        .enter()
        .append("td")
            .text(function(d) { return d.value; });
    
    return table;
}

//
// ---------------------------

// reload the data on periodic intervals
// animate!!
/*
//setTimeout(function() {
setInterval(function() {
    // repeat, helooo memory bloat
    reloadJson();
},5000);
*/

// ---------------------------
//
// load a dataset from an AJAX call, thus we have to set up
// a callback that everything else gets called from
// (we can't do anything unless we load the json data
//       d3.json( file , callback() );

function reloadJson() {
    console.log( "Reloading JSON data" );
    d3.json( infile , initData );
}

//var infile = "loom-large.json" ;
//d3.json( infile , initData );

// ---------------------------
// this would ideally be a model object for the data
// and call myModel.initData() etc
//

function initData( json ) {
    // called once we load the json
    //console.log ( "json loaded" , json );
    console.log ( "json loaded" );

    //
    jsonData = readData( json );

    if ( jsonData ) {
        // run some initial processing on the data model
        myController.indexHostTypes( json );  
        myController.indexHosts( json );  
        myController.update();
    }
}

function readData( json ) {
    if ( ! json ) {
        console.warn( "json data is missing" );
        return ;
    }

    // add in some missing data
    json.switches.forEach(function(d, i) {
        d.nodetype = 'root';
    });

    //console.log( json );

    return ( json );
}

// ---------------------------
var myController = {
    // variables
    viewState: 'hosts',
    //viewState: 'groups',

    // need an ENUM variable
    /*
    var en = { A: 1, B:2 };
    if en.A ...
        */

    init: function() {
        // this is the main function, all the work happens here
        reloadJson();

    },

    setState: function(state) {
        // pass a string to set the state
        if ( state ) {
            this.viewState = state ;
        }
        this.update();
    },

    // state handler for the various draw modes
    update: function() {
        // this will only get called once
        myGraph.init();

        //var legend = d3.select("text");
        //console.log ( 'update' , this.viewState );

        // draw the graph based on the current state
        switch(this.viewState) {
            case 'hosts':
                //legend.text( "Hosts" );
                this.drawHosts( jsonData );
                break;
            case 'groups':
                // hosts and Switches
                //legend.text( "Hosts + Groups" );
                this.drawHostGroups( jsonData );
                break;
            case 'switches':
                // hosts and Switches
                //legend.text( "Hosts + Switches" );
                this.drawSwitches( jsonData );
                break;
            case 'uplinks':
                // switches and uplinks
                //legend.text( "Switches + Uplinks" );
                this.drawSwitchUplinks( jsonData );
                break;
            case 'flows':
                // flows
                //legend.text( "Hosts + Flows" );
                this.drawFlows( jsonData );
                break;
            /*
            default:
                // hosts only
                //legend.text( "Hosts" );
                this.drawHosts( jsonData );
                */
        }

        //
        // redraw the scene
        myGraph.redraw();

    },

    // -------------

    drawHosts: function(json) {
        myGraph.setNodes( this.getHostNodes( json ) );
        //this.setNodesToHosts( json );
        myGraph.setLinks();
        return 1;
    },

    drawHostGroups: function(json) {
        this.drawHosts( json );
        myGraph.addNodes( this.getGroupNodes( json ) );
        myGraph.setLinks( this.getGroupLinks( json ) );
        return 1;
    },

    drawFlows: function( json ) {
        // for small sets we show host flows
        // for large sets we show group flows
        var hn = this.getHostNodes( json );
        if ( hn.length > 1 ) {
            myGraph.setNodes( hn );
            myGraph.setLinks( json.flows );
        }
        else {
            myGraph.setNodes( this.getGroupNodes( json ) );
            myGraph.setLinks( this.getGroupFlows( json ) );
        }

        return 1;
    },

    drawSwitches: function(json) {
        // for small sets we draw hosts and switches,
        // for large lists we draw just the switches
        myGraph.setNodes( json.switches );

        var hn = this.getHostNodes( json );
        // summary (large) lists have a length of 1
        if ( hn.length > 1 ) {
            // add in the host detail
            myGraph.addNodes( hn );
            // setLinks() will always reindex the node list
            // and reindex the link list
            myGraph.setLinks( this.getSwitchLinks( json ) );
        }
        else {
            // no links, just switches
            myGraph.setLinks();
        }

        return 1;
    },

    drawSwitchUplinks: function(json) {
        this.drawSwitches( json );

        // as long as we called 'setLinks()', the nodelist
        // will already be indexed
        myGraph.addAndIndexLinks( json.uplinks );
    },

    //--------

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

    indexHosts: function( json ) {
        // lazy instantiation
        if ( json.hostIndex ) {
            return ;
        }

        // index the nodes by 'id'
        json.hostIndex = {};
        json.hosts.forEach(function(d, i) {
            json.hostIndex[d.id] = d;
        });
    },

    getHostNodes: function( json ) {

        //console.log ( "Setting nodes to hosts");

        var hnodes = [];
        if ( json.hosts.length < MAXNODES ) {
            hnodes = json.hosts ;
        }
        else {
            // just a summary node
            hnodes.push({
                "id": "summ", 
                "name": json.hosts.length + " hosts",
                "type": "summary", 
                 "ovs": ""
            });
        }

        return hnodes;
    },

    getGroupFlows: function( json ) {
        // summarise flows by group
        var gflows = [];

        // We assume the host by index was created at data load

        // now walk the flows to get the host type
        // [ ] see 'getHostFlows();
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

        var flist = [];

        // now walk the flow summaries
        Object.keys(flowIndex).forEach(function(k, i) {
            var fsrc = k;
            Object.keys(flowIndex[fsrc]).forEach(function(k, i) {
                var fdst = k;

                //console.log ( "add flow : " , fsrc , fdst );

                if ( ! ( fsrc === fdst ) ) {
                    flist.push({
                        src: fsrc,
                        dst: fdst
                    });
                }
            });
        });

        return flist ;

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

    getSwitchLinks: function(json) {
        var swlinks = [];

        // list what switch each host is connected to
        if ( json.hosts.length < MAXNODES ) {
            json.hosts.forEach(function(d, i) {
                swlinks.push({
                    src: d.id,
                    dst: d.ovs
                });
            });
        }

        return swlinks ;

    },

    // end model functions
    // --------------------------

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

// there is a problem here involving REFS, once you make a call to 
// d3.layout.force() all sorts of REFS to the links and nodes list get
// created and mesed with, so we have to create all these arrays
// BEFORE we make a call to force.links()

        this.d3Layout = d3.layout.force()
            // point to the JSON dataset
            .nodes(this.nodes)
            .links(this.links)
            .charge(-200)
            .linkDistance(90)
            .size([width, height])
            // the tick method creates the layout, so it needs to return the
            // nodes and link info, see below
            .on("tick", this.tick);

        /*
        force = d3.sankey()
            .size([width, height])
            .nodes(this.nodes)
            .links(this.links)
            .layout(32)
        */

        /*
        var info = d3.select("body").append("text")
            .text("messaging");
        */
            

        var lsvg = d3.select("body").append("svg")
            .attr("width", width)
            .attr("height", height);

        // floating text object
        lsvg.append("text")
            .attr("x", function(d) { return myG.viewX(.55); })
            .attr("y", function(d) { return myG.viewY(.95); })
            .attr("id", 'legend')
            .text("");

        lnodes = lsvg.selectAll(".node");
        llinks = lsvg.selectAll(".link");

        this.setView({
            svg: lsvg,
            links: llinks,
            nodes: lnodes
        });

        // render the table
        var peopleTable = flowTable( jsonData.flows );

    },

    redraw: function(){
        // render the data in the SVG.
        // we assume we have valid nodes[] and links[] arrays

        // console.log ( "mygraph redraw", myGraph );

        // redraw the graph based on our data
        var snodes = this.getView().nodes; 
        var slinks = this.getView().links; 

        // set the data for the list of nodes
        snodes = snodes.data(this.d3Layout.nodes(), 
            function(d) { return d.id;});

        // hang everything off a 'g.node'
        snodes.enter()
            .append("g")
            .attr("class","node")
            .call(this.d3Layout.drag)

            .on( 'click' , function(e) {
                // find out what object we clicked on
                if ( d3.event && d3.event.srcElement ) {
                    var d = d3.event.srcElement.__data__;
                    console.log ( 'node click', d3.event , d );
                    var i = d3.select( '#legend' );
                    i.text( ' id:' + d.id
                        + ' name:' + d.name
                        + ' switch:' + d.ovs
                        + ' port:' + d.port
                        );
                    //i.x = d3.event.clientX ;

                    console.log ( i );

                }
            })

        snodes
            .append("circle")
            .attr("class", function(d) { 
                return "node " + d.type; })
            .attr("r", function(d) {
                return getClassSize(d) })

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

        // we've moved where this ref points to,
        // so we need to update it 
        this.getView().nodes = snodes ;

        // and the links...
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
        this.getView().links = slinks ;

        this.d3Layout.start();

    },

    tick: function() {

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

    },

    // helper methods
    reindexNodes: function(){
        // index the nodes by 'id'

        // use a localvar to getaround 'this' popping
        var ni = {} ;
        this.nodes.forEach(function(d, i) {
            ni[d.id] = d;
        });

        this.nodeIndex = ni ;
    },

    setNodes: function(n){
        // for efficiency and to make the graph animate better
        // we should push and pull from the nodes list, instead
        // of clobbering it each time

        // so we do a diff here of the current node list and the new one

        // this will also reset the list

        /*
        this.nodes.length = 0 ;
        if ( n ) {
            this.nodes.push.apply( this.nodes , n );
        }
        */

        if ( n ) {
            mergeArray( this.nodes , n );
        }
        else {
            this.nodes.length = 0 ;
        }

        this.reindexNodes();
    },

    addNodes: function(n){
        //adding nodes should not require reindexing the links
        // but we do need to update the index

        // console.log ( 'addn' , this.nodes );
        // console.log ( 'addn' , n );

        var nodelist = this.nodes;
        var ni = this.nodeIndex;
        n.forEach(function(d,i){
            nodelist.push( d );
            ni[d.id] = d;
        });
    },

    setLinks: function(l) {
        // this will also reset the list
        this.links.length = 0 ;
        if ( l ) {
            this.links.push.apply( this.links , l );
        }

        // at a minimum, you need to force reindexing of nodes
        this.reindexLinks();

    },
    addLinks: function(l){
        // just add a link array, but don't index
        this.links.push.apply( this.links , l );
    },

    addAndIndexLinks: function(l){
        // add a link and reindex on the fly
        // assumes the nodes link is OK

        // make temp vars to get around namespace issues
        var ni = this.nodeIndex ;
        var linklist = this.links ;

        //console.log( "node index" , ni );

        l.forEach(function(d, i) {

            //console.log( "adding indexed link" , d );

            if ( ni[d.src] && ni[d.dst] ) {
                d.source = ni[d.src];
                d.target = ni[d.dst];

                linklist.push(d);
            }
        });
        
        // [ ] error if the nodes do not exist
        // [ ] don't create the link
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

        // links may point to non-existent nodes,
        // so we have to filter them out by using a temp
        var linklist = [];

        // now walk the links array and insert refs to the nodes
        // force.links uses 'd.source' and 'd.target'
        this.links.forEach(function(d, i) {
            if ( ni[d.src] && ni[d.dst] ) {
                d.source = ni[d.src];
                d.target = ni[d.dst];
                linklist.push ( d );
            }
        });

        this.links.length = 0 ;
        this.links.push.apply( this.links , linklist );

    }
};

//-------------------

function getClassSize(d) {
    // calculate a size based on an nodes class
    return d.nodetype === 'root' ? 16 : 8;
}

function mergeArray( orig , n ) {
    // merge 'n' into 'o' by comparing the the 'ID' value
    // of the merge object

    // 1) index the new array
    var newIdx = {} ;
    n.forEach(function(d, i) {
        newIdx[d.id] = d ;
    });

    // walk the original array finding the elements to remove.
    // we can't remove them in-situ, because this messes with forEach()
    var delIdx = [];
    orig.forEach(function(d, i) {
        if ( newIdx[d.id] ) {
            // remove this from the new index, we already have it
            delete newIdx[d.id];
        }
        else {
            // flag this for removal from the old index
            // use unshift to reverse the array order
            delIdx.unshift(i);
        }
    });

    // now delete the items from the OLD , from top down
    // because we work from the HIGHEST index, we don't risk
    // rearranging the array contents
    delIdx.forEach(function(i){
        orig.splice(i,1);
    });

    //console.log( 'del l' , delIdx );
    //console.log( 'new l' , l );
    //console.log( 'new m' , m );
    //console.log( 'new newIdx' , newIdx );

    // lastly add the new elements to the array,
    // based on what's left in the index
    Object.keys(newIdx).forEach(function(key) {
        orig.push( newIdx[key] );
    });

}

// ---------------------------
// lets get this party started
//
myController.init();


