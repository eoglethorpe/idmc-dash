var DrawBarChart = function(){

    this.init = function(){

        d3.selection.prototype.moveToFront = function() {
          return this.each(function(){
            this.parentNode.appendChild(this);
          });
        };
        return this;
    };
    var colorsLine = [ "rgb(114, 147, 203)", "rgb(225, 151, 76)",
                       "rgb(132, 186, 91)", "rgb(211, 94, 96)",
                       "rgb(128, 133, 133)", "rgb(144, 103, 167)",
                       "rgb(171, 104, 87)", "rgb(204, 194, 16)"],
        colorsArea = [ "rgb(57, 106, 177)", "rgb(218, 124, 48)",
                       "rgb(62, 150, 81)", "rgb(204, 37, 41)",
                       "rgb(83, 81, 84)", "rgb(107, 76, 154)",
                       "rgb(146, 36, 40)", "rgb(148, 139, 61)",
                       "rgb(114, 147, 203)", "rgb(225, 151, 76)"],
        hazardsColor = d3.schemeCategory20c;


    var getColor = function(type, index){
        if (type == 'area'){
            index = index % colorsArea.length;
            return colorsArea[index];
        }else if(type == 'line'){
            index = index % colorsLine.length;
            return colorsLine[index];
        }
    };

    var getColorForHazard = function(hazards, type, hazard){
        return hazardsColor[hazards[type].indexOf(hazard)];
    };
    var fadeBar = function(bar){
        bar.attr('old-color', bar.style("fill"));
        let newColor = d3.color(bar.attr('old-color'));
        newColor.g = 150;
        newColor.b = 150;
        bar.style("fill", newColor);
    };

    var unFadeBar = function(bar){
        bar.style("fill", bar.attr('old-color'));
    };

    var readablizeNumber = function(number) {
        var s = ['', 'k', 'M', 'B'];
        var e = Math.floor(Math.log(number) / Math.log(1000));
        return (number / Math.pow(1000, e)).toFixed(0) + "" + s[e];
    };

    var superscript = "⁰¹²³⁴⁵⁶⁷⁸⁹";
    var powerOfTen = function(d) {
          return d / Math.pow(10, Math.ceil(Math.log(d) / Math.LN10 - 1e-12)) === 1;
    };
    var formatPower = function(d) {
        return (d + "").split("").map(function(c) {
                return superscript[c];
            }).join("");
    };
    var tickFormatLog = function(d){
        if (powerOfTen(d)){
            let tenPower = Math.round(Math.log(d) / Math.LN10),
                sign = '';
            if(tenPower < 0){sign = '⁻'};
            return 10 + sign + formatPower(Math.round(Math.log(d) / Math.LN10));
        }
        //return d3.format(".1s")(d);
    };

    var tickFormat = function(d){
        return d3.format(".3s")(d);
        //if (d == 0){ return 0}
        //if (d <= 0){ return '-'+readablizeNumber(d*-1);}
        //return readablizeNumber(d);
    };

        //for showing info on mouse over
    //
    var toolTip = d3.select("body")
                        .append("div")
                        .attr("class", "tooltip")
                        .style("opacity", 0);

    var toolTipMouseover = function(d, i){
        if(d.x && d.y){
            toolTip
                .html('X: '+d.x+'<br>Y: <strong>'+d3.format(".3s")(d.y)+'</strong>')
                //.style("background", d3.select(this).style("fill"))
        }else if(d[0].data.x){
            toolTip
            .html('Country: '+d[0].data.x+
                  '<br>Type: <strong>'+d[0].data.type+'</strong>'+
                  '<br>Hazard: <strong>'+d.key+'</strong>'+
                  '<br>AAD: <strong>'+d3.format(".3s")(d[0][1]-d[0][0])+'</strong>')
        };
            toolTip
                .transition()
                .duration(200)
                .style("opacity", .9)
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 60) + "px")
                .style("visibility", 'visible');
        fadeBar(d3.select(this));
    },
    toolTipMousemove = function(d, i){
        toolTip.style("top", (d3.event.pageY-60)+"px").style("left",(d3.event.pageX+10)+"px");
    },
    toolTipMouseout = function(d, i){
        unFadeBar(d3.select(this));
        toolTip
            .transition()
            .duration(100)
            .style("opacity", 0)
            .style("visibility", 'hidden');
    }

    this.drawPath = function(documentId, datasetC, labels, errorBand=false, barPadding = 1) {

        let dataset = datasetC.slice();
        dataset.sort(function(d1, d2){return d1.x - d2.x});

        let yScale = d3.scaleLinear(),
            xScale = d3.scaleLog(),
            colorScale = d3.scaleLinear();

        let axisPadding = 1;
        let parent = $(documentId);
        let width = parent.width(),
            height = parent.height(),
            fontSize = ((parent.width()/(4*dataset.length))-barPadding)
                       .toFixed(),
            padding = 30;

        // y - axis Value scale
        yScale.domain([0, d3.max(dataset, function(data) {
                return d3.max(data, function(data){
                    return data.y;
                })
        })]);
        // x - axis scale
        xScale.domain([0.1, d3.max(dataset, function(data) {
                return d3.max(data, function(data){
                    return data.x;
                })
        })]);

        yScale.range([height-padding, axisPadding*padding]);
        xScale.range([axisPadding*padding, width]);
        // color - Value scale
        colorScale.domain([d3.min(dataset), d3.max(dataset)]);
        colorScale.range([0, 255]);

        //Clear previous html
        parent.html('');

        let xAxis = d3.axisBottom(xScale)
                    .tickSize(-height+2*padding)
                    .tickFormat(tickFormatLog),
            yAxis = d3.axisLeft(yScale)
                    .tickSize(-width+padding)
                    .tickFormat(tickFormat);

        let svg = d3.select(documentId)
            //create svg tag
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", "0 0 "+width+" "+height)
            .attr("preserveAspectRatio", "xMidYMid meet");

        let gX = svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0,"+ (height-padding)+")")
            .call(xAxis);

        let gY = svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + padding + ",0)")
            .call(yAxis);

        let axisLineDot = function(){
            gX.selectAll(".tick line")
                .attr("stroke-dasharray", "2,2");
            gY.selectAll(".tick line")
                .attr("stroke-dasharray", "2,2");
        };

        axisLineDot();

        // Clipping
        svg.append('defs')
            .append('clipPath')
            .attr('id', 'path-clip')
            .append('rect')
            .attr('x', padding)
            .attr('y', padding)
            .attr('width', width - padding)
            .attr('height', height - 2*padding);

        var lineFunction = d3.line()
                             .x(function(d, i) {
                                 return xScale(d.x);
                             })
                             .y(function(d, i) { return yScale(d.y); })

        var CAreaFunction = d3.area()
                              .x(function(d){return xScale(d.x);})
                              .y0(function(d){return yScale(d.y+d.e);})
                              .y1(function(d){return yScale(d.y-d.e);});

        //used by zoom
        let views = [];
        let pathWrapper = svg.append("g");
        let legendWrapper = svg.append("g");

        // for each data draw lines and area
        dataset.forEach(function(dataset, index){
            let view = pathWrapper.append("g")
                .attr('class', 'main')
                .attr('clip-path', 'url(#path-clip)');

            let pathView = view.append("g");

            if(errorBand){
                pathView.append("path")
                        .attr("d", CAreaFunction(dataset))
                        .attr("fill", getColor('area', index))
                        .style("opacity", 0.8);
            };

            pathView.append("path")
                               .attr("d", lineFunction(dataset))
                               .attr("stroke", getColor('line', index))
                               .attr("stroke-width", 2)
                               .attr("fill", "none");

            let circle = view.append("g")
                .selectAll("circle")
                .data(dataset)
                .enter()
                .append("circle")
                .attr("cx", function(d, i) { return xScale(d.x); })
                .attr("cy", function(d, i) { return yScale(d.y); })
                .attr("r", 5)
                .style("fill", getColor('line', index))
                .on("mouseover", toolTipMouseover)
                .on("mousemove", toolTipMousemove)
                .on("mouseout", toolTipMouseout);

            legend = legendWrapper.append("g")
                .attr('class', 'legend')
                .attr('transform', function(d) {
                    var h = 15;
                    var x = width*.75;
                    var y = 50 + index*h;
                return 'translate(' + x + ',' + y + ')';
            })

            legend.append('rect')
                .attr('width', '20px')
                .attr('height', '2px')
                .style('fill', getColor('area', index))
                .style('stroke', getColor('line', index))
                .on("mouseover", function(){
                    //clipping problem
                    view.moveToFront();
                });

            legend.append('text')
                .attr('x', 1.5*20)
                .attr('y', 5)
                .attr('font-size', '10px')
                .text(labels[index])
                .on("mouseover", function(){
                    //clipping problem
                    view.moveToFront();
                });

            views.push(pathView)
            views.push(circle)
        });

        d3.select(documentId)
            .style('position', 'relative')
            .append("div")
            .attr("class", "button-wrapper");

        /*
        let redrawButtonG = d3.select(documentId)
            .selectAll("div.button-wrapper")
            .append("button")
            .text("Redraw")
            .on("click", function(){
                return draw(documentId, dataset, barPadding);
            })
        */

        let zoom = d3.zoom()
            .scaleExtent([.8, 40])
            .translateExtent([[-100, -100], [width + 90, height + 100]])
            .on("zoom", zoomed);

        svg.call(zoom);

        d3.select(documentId)
            .select(".button-wrapper")
            .append("button")
            .html('<i class="fa fa-search-plus"></i>')
            .on("click", function(){
              svg.transition()
                  .duration(250)
                  .call(zoom.scaleBy, 1.3);
            });

        d3.select(documentId)
            .select(".button-wrapper")
            .append("button")
            .html('<i class="fa fa-search-minus"></i>')
            .on("click", function(){
              svg.transition()
                  .duration(250)
                  .call(zoom.scaleBy, .7);
            });

        d3.select(documentId)
            .select(".button-wrapper")
            .append("button")
            .html('<i class="fa fa-undo"></i>')
            .on("click", function(){
                resetted();
            });

        setTimeout(function() {resetted();}, 1000);

        function zoomed() {
          views.forEach(function(view){
              view.attr("transform", d3.event.transform);
          });
          gX.call(xAxis.scale(d3.event.transform.rescaleX(xScale)));
          gY.call(yAxis.scale(d3.event.transform.rescaleY(yScale)));
          axisLineDot();
        }

        function resetted() {
          svg.transition()
              .duration(750)
              .call(zoom.transform, d3.zoomIdentity.scale(.9).translate(0, 20));
              //.call(zoom.transform, d3.zoomIdentity);
        }

    };

    this.drawBar = function(documentId, datasetC, hazards, showType, barPadding = 1) {

        let dataset = datasetC.slice();
        let yScale = d3.scaleLog(),
            xScale = d3.scaleBand(),
            labelScale = d3.scaleBand();

        let axisPadding = 1;
        let parent = $(documentId);
        let width = parent.width() -10 ,
            height = parent.height() -10 ,
            fontSize = ((parent.width()/(4*dataset.length))-barPadding)
                       .toFixed(),
            padding = 25;

        // y - axis Value scale
        yScale.domain([0.1, d3.max(dataset, function(data) {
            let max = 0;
            for(let d in data){
                if(d == 'x'){continue;}
                if(data[d]['total'] != undefined){
                    max = Math.max(max, data[d]['total']);
                }else{
                    let newmax = 0;
                    for(let e in data[d]){
                        newmax += data[d][e];
                    }
                    max = Math.max(max, newmax);
                }
            }
            return max;
        })]);
        // x - axis scale
        xScale.domain(dataset.map(function(d){return d.x;}));
        labelScale.domain([].concat.apply([], (Object.keys(hazards).map(function(d){
                                return hazards[d];}))));

        yScale.range([height-padding, axisPadding*padding]);
        xScale.range([axisPadding*padding, width], .9);
        labelScale.range([0, width-padding*3]);

        //Clear previous html
        parent.html('');

        let xAxis = d3.axisBottom(xScale)
                    .tickSize(-height+2*padding),
            yAxis = d3.axisLeft(yScale)
                    .tickSize(1)
                    .tickFormat(tickFormatLog);

        let svg = d3.select(documentId)
            //create svg tag
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", "0 0 "+width+" "+height)
            .attr("preserveAspectRatio", "xMidYMid meet");

        let gX = svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0,"+ (height-padding)+")")
            .call(xAxis);

        let gY = svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + padding + ",0)")
            .call(yAxis);

        let axisLineDot = function(){
            gY.selectAll(".tick line")
                .attr("stroke-dasharray", "2,2");
        };

        axisLineDot();

        // Clipping
        svg.append('defs')
            .append('clipPath')
            .attr('id', 'bar-clip')
            .append('rect')
            .attr('x', padding)
            .attr('y', padding)
            .attr('width', width - padding)
            .attr('height', height - 2*padding);

        let view = svg.append("g")
                .attr('class', 'main')
                .attr('clip-path', 'url(#bar-clip)');

        //Types to show i.e 'Prospective', 'Retrospective', 'Hybrid'
        //TODO: use lowercase with searching
        if (showType == undefined){
            showType = ['Prospective', 'Retrospective', 'Hybrid'];
        };
        // for each data draw bar
        let barView = view.append("g")
            .selectAll("rect")
            .data(dataset)
            .enter()
            .selectAll("rect")
            .data(function(data) {
                let newData = [],
                    typeList = Object.keys(data);
                typeList.pop("x")
                for (let key in data){
                    if (key === 'x'){continue};
                    if (showType.indexOf(key) === -1) {continue;}

                    data[key]['x'] = data['x'];
                    data[key]['type'] = key;
                    // (-1) remove 'x' key
                    data[key]['lenofType'] = Object.keys(data).length-1;
                    typeList.forEach(function(d, i){
                        if (showType.indexOf(d) == -1) {
                            data[key]['lenofType'] -= 1;
                        }
                    });
                    newData.push(data[key]);
                };
                return newData;
            })
            .enter()
            .selectAll("rect")
            .data(function(data) {
                let keys = Object.keys(data),
                    nonKey = ['type', 'x',
                              'lenofType'];
                if (keys.length > nonKey.length + 1){
                    nonKey = nonKey.concat(['Total', 'total']);
                }
                keys = keys.filter(function(d){
                    if (nonKey.indexOf(d) == -1){
                        if (hazards[data.type].indexOf(d) == -1){return false;}
                        return true;
                    }
                    return false;
                });
                keys.sort(function(a, b){ return data[a]-data[b]; });
                return d3.stack().keys(keys)
                         .order(d3.stackOrderNone)
                         .offset(d3.stackOffsetNone)([data]);
            })
            .enter()
            //create new rect tag
            .append("rect")
            //configure rect
            .attr("x", function(d) {
                return xScale(d[0].data.x) +
                    (xScale.bandwidth()/d[0].data.lenofType)*showType.indexOf(d[0].data.type);
            })
            .attr("width", function(d){
                return xScale.bandwidth()/d[0].data.lenofType - barPadding;
            })
            .attr("fill", function(d) {
                return getColorForHazard(hazards,d[0].data.type, d.key);
            })
            .on("mouseover", toolTipMouseover)
            .on("mousemove",toolTipMousemove)
            .on("mouseout", toolTipMouseout)
            .attr("y", function(d) {
                return yScale.range()[0];
            })
            .transition()
            .duration(2000)
            .attr("y", function(d) {
                let y1 = d[0][1]==0?0.1:d[0][1];
                return yScale(y1);
            })
            .attr("height", function(d) {
                let y1 = d[0][1]==0?0.1:d[0][1],
                    y0 = d[0][0]==0?0.1:d[0][0],
                    diff = yScale(y0) - yScale(y1)
                diff = diff<=0?-diff:diff;
                return diff;
            });

        let legend = svg.append("g")
                .attr('class', 'legend')
                .attr('transform', function(d) {
                    var h = 0;
                    var x = width*.05;
                    var y = 10 + h;
                return 'translate(' + x + ',' + y + ')';
            })

        legend
            .selectAll("rect")
            .data(labelScale.domain())
            .enter()
            .append('rect')
            .attr('x', function(d){return labelScale(d)-5;})
            .attr('width', labelScale.bandwidth()-1)
            .attr('height', '2px')
            .attr('stroke', function(h, i){
                //return getColor('line', i);
            })
            .attr('fill', function(h){
                return getColorForHazard(hazards, 'Prospective', h);
            });

        legend
            .selectAll("text")
            .data(labelScale.domain())
            .enter()
            .append('text')
            .attr('x', function(d){return labelScale(d)-5;})
            .attr('y', function(d){return -2;})
            .style("font-size", function(d){
                return labelScale.bandwidth()/10;
            })
            .text(function(d){return d;});

        let gXSize = gX.selectAll('.tick text').size();
        if ( gXSize > 25){
            gX.selectAll('.tick text')
                .transition()
                .duration(2000)
                .style("font-size", function(){
                    if (gXSize > 30){
                        return 1.5*xScale.bandwidth()/d3.select(this).text().length +'px';
                    }
                })
                .attr("transform", "translate(5,10)rotate(45)");
        }
    };
};
