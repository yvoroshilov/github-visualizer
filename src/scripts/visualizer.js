let levels = [];
// each cell represents a set of occupied levels
let levelLines = [];
let straightLines = [];
let curveLines = [];

/*
const MAX_NODES = 30;
const MAX_BRANCHES = 10;
const BASE_RADIUS_MAX = 80;
const BASE_RADIUS_MIN = 30;
const BASE_DISTANCE_HORIZONTAL_MAX = 330;
const BASE_DISTANCE_VERTICAL_MIN = 130;
*/
// with no padding included
//let width = (radius * 2 + (distanceHorizontal - radius * 2)) * maxCommits > svgSize.width ? (radius * 2 + (distanceHorizontal - radius * 2)) * maxCommits : svgSize.width;
let baseWidth;
let baseHeight;

let radius;
let distanceHorizontal;
let distanceVertical;
let initialPosX;
let initialPosY;
let lineWidth;

function computeBaseValues () {
    let svgElem = document.getElementsByTagName("svg")[0];
    let svgSize = {
        width: svgElem.getBoundingClientRect().width,
        height: svgElem.getBoundingClientRect().height
    };
    baseWidth = svgSize.width;
    baseHeight = svgSize.height;

    initialPosX = 0.04 * baseWidth;
    initialPosY = 0.9 * baseHeight;
    distanceVertical = 130;
    distanceHorizontal = 124;
    radius = 30;
    lineWidth = 30;
}

async function visualize () {
    await buildGraph();
    setLevels();
    createLines();
    computeBaseValues();
    const svg = d3.select("svg");
    const g = svg.append("g");
    console.log(document.getElementsByTagName("svg")[0].getBoundingClientRect());
    console.log(levels);
    console.log(straightLines);
    console.log(curveLines);
    console.log(levelLines);
    console.log(allUniqueCommits);
    svg.attr("viewBox", [0, 0, baseWidth, baseHeight]);
    svg.call(d3.zoom()
            .extent([[0, 0], [baseWidth, baseHeight]])
            .scaleExtent([0.005, 8])
            .on("zoom", () => g.attr("transform", d3.event.transform)));
    /*
     svg.append("path")
        .attr("d", getEdge([150, 150], [190, 100]));
     */
    /*
    // drawing straight lines
    g.selectAll("line")
            .data(straightLines)
        .enter().append("line")
            //.attr("class", "straight")
            .attr("x1", (d) => getPosX(indexOfSha(allUniqueCommits, d.begin.sha)))
            .attr("y1", (d) => getPosY(indexOfSha(allUniqueCommits, d.begin.sha)))
            .attr("x2", (d) => getPosX(indexOfSha(allUniqueCommits, d.end.sha)))
            .attr("y2", (d) => getPosY(indexOfSha(allUniqueCommits, d.end.sha)))
            .attr("stroke-width", lineWidth);

     */

    // drawing curve lines
    g.selectAll("path")
            .data(curveLines)
        .enter().append("path")
            //.attr("class", "curve")
            .attr("d" , function (d) {
                let beginIndex = indexOfSha(allUniqueCommits, d.begin.sha);
                let endIndex = indexOfSha(allUniqueCommits, d.end.sha);
                let level = d.level;
                let beginX;
                let beginY;
                let endX;
                let endY;
                switch (getLineStyle(beginIndex, endIndex)) {
                    case 0: {
                        beginX = getPosX(beginIndex) + radius / 2;
                        beginY = getPosY(beginIndex) - radius / 2;
                        endX = getPosX(endIndex) - radius / 2;
                        endY = getPosY(endIndex) - radius / 2;

                        let reversed = levels[beginIndex] > levels[endIndex];
                        return getCurve([beginX, beginY], [endX, endY], reversed);
                    }
                    case 1: {
                        let x1 = getPosX(beginIndex);
                        let y1 = getPosY(beginIndex);
                        let x2 = getPosX(endIndex - 1);
                        let y2 = getPosY(beginIndex);
                        g.append("line")
                                .attr("x1", x1)
                                .attr("y1", y1)
                                .attr("x2", x2)
                                .attr("y2", y2)
                                .attr("stroke-width", lineWidth);
                        beginX = x2 + radius / 2;
                        beginY = y2 - radius / 2;
                        endX = getPosX(endIndex) - radius / 2;
                        endY = getPosY(endIndex) - radius / 2;

                        let reversed = levels[beginIndex] > levels[endIndex];
                        return getCurve([beginX, beginY], [endX, endY], reversed);
                    }
                    case 2: {
                        let x1 = getPosX(beginIndex + 1);
                        let y1 = getPosY(endIndex);
                        let x2 = getPosX(endIndex);
                        let y2 = getPosY(endIndex);
                        g.append("line")
                                .attr("x1", x1)
                                .attr("y1", y1)
                                .attr("x2", x2)
                                .attr("y2", y2)
                                .attr("stroke-width", lineWidth);
                        beginX = getPosX(beginIndex) + radius / 2;
                        beginY = getPosY(beginIndex) - radius / 2;
                        endX = getPosX(beginIndex + 1) - radius / 2;
                        endY = getPosY(endIndex) - radius / 2;

                        let reversed = levels[beginIndex] > levels[endIndex];
                        return getCurve([beginX, beginY], [endX, endY], reversed);
                    }
                    case 3: {
                        let x1 = getPosX(beginIndex + 1);
                        let y1 = getPosY(-1, level);
                        let x2 = getPosX(endIndex - 1);
                        let y2 = getPosY(-1, level);
                        g.append("line")
                                .attr("x1", x1)
                                .attr("y1", y1)
                                .attr("x2", x2)
                                .attr("y2", y2)
                                .attr("stroke-width", lineWidth);
                        let beginX1 = getPosX(beginIndex) + radius / 2;
                        let beginY1 = getPosY(beginIndex) - radius / 2;
                        let endX1 = getPosX(beginIndex + 1) - radius / 2;
                        let endY1 = getPosY(-1, level) - radius / 2;
                        let beginX2 = x2 + radius / 2;
                        let beginY2 = y2 - radius / 2;
                        let endX2 = getPosX(endIndex) - radius / 2;
                        let endY2 = getPosY(endIndex) - radius / 2;

                        let reversed = levels[beginIndex] > levels[endIndex];
                        if (reversed) {
                            g.append("path")
                                    .attr("d", getCurve([beginX1, beginY1], [endX1, endY1], reversed))
                                    .attr("stroke-width", 0);
                            return getCurve([beginX2, beginY2], [endX2, endY2], reversed);
                        } else {
                            g.append("path")
                                    .attr("d", getCurve([beginX1, beginY1], [endX1, endY1]))
                                    .attr("stroke-width", 0);
                            return getCurve([beginX2, beginY2], [endX2, endY2]);
                        }
                    }
                }
            })
            .attr("stroke-width", 0);


    // drawing nodes
    g.selectAll("circle")
            .data(allUniqueCommits)
        .enter().append("circle")
            .attr("cx", (d, i) => getPosX(i))
            .attr("cy", (d, i) => getPosY(i))
            .attr("r", radius);
    g.selectAll("text")
            .data(allUniqueCommits)
        .enter().append("text")
            .attr("x", (d, i) => getPosX(i) - radius)
            .attr("y", (d, i) => getPosY(i))
            .text((d, i) => "(" + i + ")" + d.sha.slice(0, 8));



    function getPosX (index) {
        return initialPosX + index * distanceHorizontal;
    }

    function getPosY (index, level = levels[index]) {
        return initialPosY - level * distanceVertical;
    }


    // return values:
    //0 - default
    //1 - extend begin
    //2 - extend end
    //3 - \
    //     -----
    //          \
    function getLineStyle (beginIndex, endIndex) {
        let begin = allUniqueCommits[beginIndex];
        let end = allUniqueCommits[endIndex];
        if (endIndex - beginIndex === 1) return 0;
        if ("start" in end && end.start === true) {
            return 2;
        }
        if ("start" in begin && begin.start === false) {
            return 1;
        }
        return 3;
    }

}

// start and end - arrays [x, y]
function getCurve(start, end, reversed = false) {
    /*
        1 - start point
        2 - control point
        3 - control point
        4 - end point
    */
    function constructEdge(points) {
        const lineGen = d3.line().curve(d3.curveBasis);
        let path = lineGen(points);
        if (reversed) {
            path += `L${points[3][0]},${points[3][1] + lineWidth}`;
            points.forEach(p => {
                p[0] -= lineWidth;
                p[1] += lineWidth;
            });
            points.reverse();
            points[0][0] += lineWidth;
            points[3][0] += lineWidth;
        } else {
            path += `L${points[3][0]},${points[3][1] + lineWidth}`;
            points.forEach(p => {
                p[0] += lineWidth;
                p[1] += lineWidth;
            });
            points.reverse();
            points[0][0] -= lineWidth;
            points[3][0] -= lineWidth;
        }

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

    let points;
    if (reversed) {
        points = [
            start,
            [start[0] + distanceHorizontal / 2, start[1]],
            [end[0] - distanceHorizontal / 2 + lineWidth, end[1]],
            end
        ];
    } else {
        points = [
            start,
            [start[0] + distanceHorizontal / 2 - lineWidth, start[1]],
            [end[0] - distanceHorizontal / 2, end[1]],
            end
        ];
    }
    /*
    d3.select("svg").append("g")
            .selectAll("circle")
            .data(points)
        .enter().append("circle")
            .attr("cx", (d) => d[0])
            .attr("cy", (d) => d[1])
            .attr("r", 1)
            .attr("fill", "black");
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

function setLevels () {
    allUniqueCommits.sort(comparator);
    allUniqueCommits[0].start = true;
    for (let i = 0; i < allUniqueCommits.length; i++) {
        levels[i] = -1;
        levelLines[i] = new Set();
    }

    let curLevel = -1;
    // contains chains
    let queue = [{chain: orderedCommits, chainParent: orderedCommits[0]}];
    while (queue.length !== 0) {
        if ("mergeCommit" in queue[0]) {
            let mergeCommitIndex = indexOfSha(allUniqueCommits, queue[0].mergeCommit.sha);
            let chainParentIndex = indexOfSha(allUniqueCommits, queue[0].chainParent.sha);
            if (mergeCommitIndex - chainParentIndex === 1) {
                queue.shift();
                continue;
            }
            // merge can be up and down
            curLevel = chooseLevel(chainParentIndex, mergeCommitIndex + 1, Math.min(levels[mergeCommitIndex], levels[chainParentIndex]));
            addLevel(chainParentIndex, mergeCommitIndex + 1, curLevel);
            let mergeCommitInParent = allUniqueCommits[chainParentIndex].mergeCommits.find(x => x.sha === allUniqueCommits[mergeCommitIndex].sha);
            mergeCommitInParent.level = curLevel;
            /*
            curveLines.push({
                begin: allUniqueCommits[chainParentIndex],
                end: allUniqueCommits[mergeCommitIndex],
                level: curLevel
            });
            */
            queue.shift();
        } else {
            let curChain = queue[0].chain;
            let chainParent = queue[0].chainParent;
            queue.shift();

            let begin = indexOfSha(allUniqueCommits, chainParent.sha);
            let end = indexOfSha(allUniqueCommits, curChain[curChain.length-1].sha);

            curLevel = chooseLevel(indexOfSha(allUniqueCommits, chainParent.sha), end);
            /*
            if ("children" in firstInChain && firstInChain.children.length > 1) {
                let x = firstInChain.children.length - indexOfSha(firstInChain.children, curChain[0].sha);
                curLevel = Math.max(curLevel, levels[begin] + x);
            }
             */
            addLevel(indexOfSha(allUniqueCommits, chainParent.sha), end + 1, curLevel);
            for (let i = curChain.length - 1; i >= 0; i--) {
                let index = indexOfSha(allUniqueCommits, curChain[i].sha);
                levels[index] = curLevel;
                if ("mergeCommits" in curChain[i]) {
                    for (let j = 0; j < curChain[i].mergeCommits.length; j++) {
                        queue.push({chain: null, chainParent: curChain[i], mergeCommit: curChain[i].mergeCommits[j]});
                    }
                }
                if ("children" in curChain[i]) {
                    for (let j = curChain[i].children.length - 1; j >= 0 ; j--) {
                        queue.push({chain: curChain[i].children[j], chainParent: curChain[i]});
                    }
                }
            }
        }
    }

    // begin and end - indexes
    function chooseLevel (begin, end, initialLevel = levels[begin]) {
        const MAX_LEVELS = 1000000;
        for (let level = initialLevel + 1; level < MAX_LEVELS; level++) {
            let occupied = false;
            for (let j = begin + 1; j < end; j++) {
                if (levelLines[j].has(level)) {
                    occupied = true;
                    break;
                }
            }
            if (!occupied) {
                return level;
            }
        }
    }
    
    function addLevel (begin, end, level) {
        for (let i = begin + 1; i < end; i++) {
            levelLines[i].add(level);
        }
    }

    function comparator (a, b) {
        let dateA = new Date(a.commit.committer.date);
        let dateB = new Date(b.commit.committer.date);
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        if (dateA === dateB) return 0;
    }
}

function createLines () {
    let queue = [{chain: orderedCommits, parent: orderedCommits[0]}];
    while (queue.length !== 0) {
        let curParent = queue[0].parent;
        let curChain = queue[0].chain;
        let lineBegin = curChain[0];
        let lineEnd = curChain[curChain.length - 1];
        queue.shift();
        straightLines.push({
            begin: allUniqueCommits.find(x => x.sha === lineBegin.sha),
            end: allUniqueCommits.find(x => x.sha === lineEnd.sha),
            parent: curParent
        });
        for (let i = 0; i < curChain.length; i++) {
            if ("mergeCommits" in curChain[i]) {
                for (let j = 0; j < curChain[i].mergeCommits.length; j++) {
                    let pushObject = {};
                    pushObject.begin = allUniqueCommits.find(x => x.sha === curChain[i].sha);
                    pushObject.end = allUniqueCommits.find(x => x.sha === curChain[i].mergeCommits[j].sha);
                    if ("level" in curChain[i].mergeCommits[j]) {
                        pushObject.level = curChain[i].mergeCommits[j].level;
                    }
                    curveLines.push(pushObject);
                }
            }
            if ("children" in curChain[i]) {
                for (let j = 0; j < curChain[i].children.length; j++) {
                    queue.push({chain: curChain[i].children[j], parent: curChain[i]});

                    curveLines.push({
                        begin: allUniqueCommits.find(x => x.sha === curChain[i].sha),
                        end: allUniqueCommits.find(x => x.sha === curChain[i].children[j][0].sha),
                    });
                }
            }
        }
    }
    // processing commits with no parents
    for (let i = 0; i < levels.length; i++) {
        if (levels[i] === -1) {
            for (let j = 0; j < allUniqueCommits[i].mergeCommits.length; j++) {
                curveLines.push({
                    begin: allUniqueCommits.find(x => x.sha === allUniqueCommits[i].sha),
                    end: allUniqueCommits.find(x => x.sha === allUniqueCommits[i].mergeCommits[j].sha)
                });
            }
        }
    }

}

function indexOfSha (arr, sha) {
    return arr.indexOf(arr.find(x => x.sha === sha))
}