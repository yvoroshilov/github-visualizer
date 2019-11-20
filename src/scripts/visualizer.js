let svgElem = document.getElementsByTagName("svg")[0];

let svgSize = {
    width: svgElem.getBoundingClientRect().width,
    height: svgElem.getBoundingClientRect().height
};

// start and end - arrays [x, y]
function getEdge(start, end) {
    /*
        1 - start point
        2 - control point
        3 - control point
        4 - end point
    */
    function constructEdge(points) {
        const lineGen = d3.line().curve(d3.curveBasis);
        const edgeWidth = 4;
        let path = lineGen(points);
        
        path += `L${points[3][0]},${points[3][1] + edgeWidth}`;
        points.forEach(p => {
            p[0] += edgeWidth;
            p[1] += edgeWidth;
        });
        points.reverse();
        points[0][0] -= edgeWidth;
        points[3][0] -= edgeWidth;
        
        let l = path.length;
        path += lineGen(points);
        // removing M command for linejoin occurring
        path = removeM(path, l + 1);
        
        path += `Z`;
        
        return path;
    }
    
    function removeM(path, start) {
        let i;
        for (i = start; i < path.length; i++) {
            if (path[i].match(/[a-z]/i)) break;
        }
        return path.slice(0, start - 1) + path.slice(i);
    }
    
    let points = [
        start,
        [166, 150],
        [170, 100],
        end
    ];
    /*
    d3.select("svg").append("g")
            .selectAll("circle")
            .data(points)
        .enter().append("circle")
            .attr("cx", (d) => d[0])
            .attr("cy", (d) => d[1])
            .attr("r", 1);

     */
    let str = constructEdge(points);
    /*
    d3.select("svg").append("g")
        .selectAll("circle")
        .data(points)
        .enter().append("circle")
        .attr("cx", (d) => d[0])
        .attr("cy", (d) => d[1])
        .attr("r", 1)
        .attr("fill", "blue");

     */
    return str;
}
const MAX_NODES = 30;
const MAX_BRANCHES = 10;
const BASE_WIDTH = svgSize.width;
const BASE_HEIGHT = svgSize.height;
const BASE_RADIUS_MAX = 80;
const BASE_RADIUS_MIN = 30;
const BASE_DISTANCE_HORIZONTAL_MAX = 330;
const BASE_DISTANCE_VERTICAL_MIN = 130;

function visualize () {
    const RADIUS = 30;
    const DISTANCE_HORIZONTAL = 123.75;
    const DISTANCE_VERTICAL = 130;
    // with no padding accounting
    const WIDTH = (RADIUS * 2 + (DISTANCE_HORIZONTAL - RADIUS * 2)) * maxCommits > svgSize.width ?
        (RADIUS * 2 + (DISTANCE_HORIZONTAL - RADIUS * 2)) * maxCommits : svgSize.width;

        
    
    debugger;
    
    
    
    
}
d3