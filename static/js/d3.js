function hashCode(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 8) - hash);
    }
    return hash;
}
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
function intToRGB(i, dark = false){
    var c = (i & 0x00FFFFFF)
    .toString(16)
    .toUpperCase();

    let index = parseInt("00000".substring(0, 6 - c.length) + c, 16)/0xffffff;
    var rgb;
    if(dark){
        rgb = hslToRgb(index, 0.6, 0.4);
    }
    else{
        rgb = hslToRgb(index, 0.6, 0.6);
    }
    return rgb[0].toString(16)+rgb[1].toString(16)+rgb[2].toString(16);
}

var DrawBarChart = function(){

    this.init = function(){

        d3.selection.prototype.moveToFront = function() {
          return this.each(function(){
            this.parentNode.appendChild(this);
          });
        };

        String.prototype.toProperCase = function () {
            return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
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
        hazardsColor = {
            "hydrometeorological": "rgb(0, 141, 204)",
            "tectonic": "rgb(252, 197, 67)",
            "volcanic": "rgb(206, 76, 118)",
            "landslides": "rgb(170, 128, 71)",
            "earthquake": "rgb(252, 197, 67)",
            "flood": "rgb(0, 141, 204)",
            "storm": "rgb(179, 215, 214)",
            "wind": "rgb(24, 50, 85)",
            "wind and Storm": "rgb(179, 215, 214)",
            "tsunami" : "rgb(0, 0, 128)" ,
            "total" : "rgb(0, 141, 204)"
            };

    var getColor = function(type, keyC, keyA, keyH){
        let str = keyC + keyA + keyH;
        if(type == 'area'){
            return ('#'+intToRGB(hashCode(str),true));
        }
        return ('#'+intToRGB(hashCode(str)));
    };

    var getColorForHazard = function(hazards, hazard){
        return hazardsColor[hazard.toLowerCase()];
    };

    var fadeBar = function(bar){
        //fade node with style fill
        bar.attr('old-fill', bar.style('fill'));
        bar.style('fill', d3.color(bar.style('fill')).brighter(.4));
    };

    var unFadeBar = function(bar){
        //unfade node with style fill
        bar.style('fill', bar.attr('old-fill'));
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
            return d3.format(",")(d);
            let tenPower = Math.round(Math.log(d) / Math.LN10),
                sign = '';
            if(tenPower < 0){sign = '⁻'};
            return 10 + sign + formatPower(Math.round(Math.log(d) / Math.LN10));
        }
        //only show 10^x tick
        //return d3.format(".1s")(d);
    };

    var tickFormat = function(d){
        return d3.format(".2s")(d);
    };

    //for showing info
    var toolTip = d3.select("body")
                        .append("div")
                        .attr("class", "tooltip")
                        .style("opacity", 0);

    var toolTipMouseover = function(d, i, node){
        // for risk upper chart
        if(d.displacement && d.frequency){
            toolTip
                .html('Displacement(X): <strong>'+d3.format(".3s")(d.displacement)+'</strong>'+
                      '<br>Frequency(Y): <strong>'+d3.format(".3s")(d.frequency)+'</strong>'+
                      '<br>Country: <strong>'+d.data.country.toUpperCase()+'</strong>'+
                      '<br>Type: <strong>'+d.data.type.toProperCase()+'</strong>'+
                      '<br>Hazard: <strong>'+d.data.hazard.toProperCase()+'</strong>')
            if(d.hasOwnProperty('displacement_stat_error')){
                toolTip.html(toolTip.html()+
                      '<br>Error: <strong>'+d3.format(".3s")(d.displacement_stat_error)+'</strong>'
                );
            }
        //for bar chart
        }else if(d[0].data.x){
            toolTip
            .html('Country: '+d[0].data.x+
                  '<br>Type: <strong>'+d[0].data.type.toProperCase()+'</strong>'+
                  '<br>Hazard: <strong>'+d.key.toProperCase()+'</strong>'+
                  '<br>AAD: <strong>'+d3.format(".3s")
                    (d.skip?d.d:d[0][1]-d[0][0])+'</strong>')
        };
        //remainig tooltip for visibility and postion
            toolTip
                .transition()
                .duration(200)
                .style("opacity", .9)
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 60) + "px")
                .style("visibility", 'visible');
        fadeBar(d3.select(node));
    },
    toolTipMousemove = function(d, i){
        //move tooltip as mouse pointer move
        toolTip.style("top", (d3.event.pageY-60)+"px").style("left",(d3.event.pageX+10)+"px");
    },
    toolTipMouseout = function(d, i, node){
        // hide tooltip on mouseout
        toolTip
            .transition()
            .duration(100)
            .style("opacity", 0)
            .style("visibility", 'hidden');
        unFadeBar(d3.select(node));
    }

    // draw upper chart(line chart)
    this.drawPath = function(documentId, dataset, hazards, showType, countries, barPadding = 1) {

        let yScale = d3.scaleLog(),
            yScaleS = d3.scaleLog(),
            xScale = d3.scaleLog();

        let axisPadding = 1;
        let parent = $(documentId);
        let width = parent.width(),
            height = parent.height(),
            hPadding = 25,
            wPadding = 65;

        let yScaleMin = 0.1,
            yScaleMax = 0,
            xScaleMin = 10,
            xScaleMax = d3.max(Object.keys(dataset), function(dataC) {
                if (countries.indexOf(dataC) == -1 ){return 0;} // filter with countries
                return d3.max(Object.keys(dataset[dataC]), function(dataA){
                    if (showType.indexOf(dataA) == -1 ){return 0;} // filter with types
                    return d3.max(Object.keys(dataset[dataC][dataA]), function(dataH){
                        if (hazards[dataA].indexOf(dataH) == -1 ){return 0;} // filter with hazards
                        return d3.max(dataset[dataC][dataA][dataH], function(data){
                            yScaleMin = Math.min(yScaleMin, data.frequency);
                            yScaleMax = Math.max(yScaleMax, data.frequency); // y-axis
                            xScaleMin = Math.min(xScaleMin, data.displacement); // y-axis
                            return data.displacement; // x-axis
                        })
                    })
                })
        });
        // yScale.domain([0, max frequency])
        yScale.domain([yScaleMin, yScaleMax]);
        yScaleS.domain([1/yScaleMin, 1/yScaleMax]);
        xScale.domain([xScaleMin, xScaleMax]);

        //range according to parent window
        yScale.range([height-hPadding, axisPadding*hPadding]);
        yScaleS.range([height-hPadding, axisPadding*hPadding]);
        xScale.range([axisPadding*wPadding, width-wPadding]);

        //Clear previous html
        parent.html('');

        let xAxis = d3.axisBottom(xScale)
                    .tickSize(-height+2*hPadding)
                    .tickFormat(tickFormatLog),
            yAxis = d3.axisLeft(yScale)
                    .tickSize(-width+2*wPadding)
                    .tickFormat(tickFormatLog),
            yAxisS = d3.axisRight(yScaleS)
                    .tickSize('1')
                    .tickFormat(tickFormatLog);

        // main container for this chart
        let svg = d3.select(documentId)
            //create svg tag
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", "0 0 "+width+" "+height)
            // for responsive
            .attr("preserveAspectRatio", "xMidYMid meet");

        // group for x-axis
        let gX = svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0,"+ (height-hPadding)+")")
            .call(xAxis);

        // group for y-axis
        let gY = svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + wPadding + ",0)")
            .call(yAxis);
        let gYS = svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" +(width-wPadding) + ",0)")
            .call(yAxisS);

        // change line to dot-dot lines
        // needed to execute everytime if zoom event generate new line
        // or TODO: add a css rule
        let axisLineDot = function(){
            gX.selectAll(".tick line")
                .attr("stroke-dasharray", "2,2");
            gY.selectAll(".tick line")
                .attr("stroke-dasharray", "2,2");
        };

        axisLineDot();

        // add axis legends
        let axisTitle = svg.append("g")
            .attr('class', 'axisTitle')

        axisTitle.append('text')//y-axis P
            .text('displacement exceedance rate [events/year]')
            .attr('transform',
                'translate(10,'+(height/2)+')rotate(-90)')
        axisTitle.append('text')//y-axis S
            .text('return period [year]')
            .attr('transform',
                'translate('+width+','+(height/2)+')rotate(-90)')
        axisTitle.append('text')//x-axis
            .text('displaced [people]')
            .attr('transform',
                'translate('+(width/2)+','+(height)+')')

        // Clipping window for inner line, area, circle and other node
        svg.append('defs')
            .append('clipPath')
            .attr('id', 'path-clip')
            .append('rect')
            .attr('x', wPadding)
            .attr('y', hPadding)
            .attr('width', width - 2*wPadding)
            .attr('height', height - 2*hPadding);

        // function to generate lines
        var lineFunction = d3.line()
                             .x(function(d, i) {
                                 return xScale(d.displacement);
                             })
                             .y(function(d, i) { return yScale(d.frequency); }),
        // function to generate area
            CAreaFunction = d3.area()
                .x(function(d){return xScale(d.displacement);})
                .y0(function(d){return yScale(d.frequency+d.displacement_stat_error);})
                .y1(function(d){return yScale(d.frequency-d.displacement_stat_error);}),

        // function to generate preview(Preview is front of all the other nodes)
            createPreview = function(pathView, circleView, areaView){
                // move node to previous wrapper
                var reAppendChildren = function(){
                    let previewCircle = previewWrapper.select('g').node(),
                        previewLine = previewWrapper.select('path.risk-line').node();
                    if (previewCircle) {circleWrapper.node().appendChild(previewCircle)};
                    if (previewLine) {pathWrapper.node().appendChild(previewLine)};
                    previewWrapper.selectAll("*").remove();
                }

                reAppendChildren();
                if (areaView != null){
                    // here node is not moved but clone[ event listenser are not cloned]
                    previewWrapper.node().appendChild(areaView.node().cloneNode(true));
                    previewWrapper.select('path').style("opacity", .9);
                }
                // here nodes are moved, they should be moved back.
                previewWrapper.node().appendChild(pathView.node());
                previewWrapper.node().appendChild(circleView.node());

                previewWrapper.on("click", function(){
                    reAppendChildren();
                });
            };

        let hazardsList = [].concat.apply([],
            (Object.keys(hazards).map(function(d){
                if (showType.indexOf(d) == -1) {return [] };
                let list = [];
                hazards[d].forEach(function(e){
                    list.push({'type':d, 'hazard': e});
                });
                return list;
            })));

        let views = [],//used by zoom
            // Wrapper with cliping rule
            clipWrapper = svg.append("g")
                        .attr('class', 'main')
                        .attr('clip-path', 'url(#path-clip)'),

            areaWrapper = clipWrapper.append("g").attr('class', 'areaWrapper'), // for error area
            pathWrapper = clipWrapper.append("g").attr('class', 'pathWrapper'), //for lines
            circleWrapper = clipWrapper.append("g").attr('class', 'circleWrapper'), // for circles(points)
            previewWrapper = clipWrapper.append("g").attr('class', 'previewWrapper'), // for preview
            legendWrapper = clipWrapper.append("g").attr('class', 'legendWrapper'); // for legends

        // to pass zoom transition, see zoom callback
        views.push(areaWrapper);
        views.push(pathWrapper);
        views.push(circleWrapper);
        views.push(previewWrapper);

        // for each data draw lines, circles and areas
        for(var keyC in dataset){
            if (countries.indexOf(keyC) == -1 ){continue;} // filter with countries
            for(var keyA in dataset[keyC]){
                if (showType.indexOf(keyA) == -1 ){continue;} // filter with types
                for(var keyH in dataset[keyC][keyA]){
                    if (hazards[keyA].indexOf(keyH) == -1 ){continue;} // filter with hazards
                    let datasetH = dataset[keyC][keyA][keyH];

                    let areaView = null;
                    if (datasetH.length && datasetH[0].hasOwnProperty('displacement_stat_error')){
                        // draw area if error is provided in the data
                        areaView = areaWrapper.append("path")
                                //.attr("d", CAreaFunction(datasetH))
                                .attr('class', 'risk-error-area')
                                .attr("fill", getColor('area', keyC, keyA, keyH))
                                .style("opacity", 0.4);
                    }

                    let circleData = {'country': keyC, 'type': keyA, 'hazard': keyH};

                    let pathView = pathWrapper.append("path")
                        .attr('tooltip-data', JSON.stringify(circleData))
                        .attr("d", lineFunction(datasetH))
                        .attr('class', 'risk-line')
                        //.attr("stroke", getColor('line', keyC, keyA, keyH))
                        .attr("stroke",
                            hazardsList.length>1?getColorForHazard(null, keyH):getColor('area', keyC, keyC, keyC))
                        .attr("stroke-width", function(){
                            if (keyA === 'prospective'){return 5;}
                            if (keyA === 'retrospective'){return 5;}
                            return 8;
                        })
                        .attr("stroke-dasharray", function(){
                            if (keyA === 'prospective'){return "2,2";}
                            if (keyA === 'retrospective'){return "5,8";}
                            return "";
                        })
                        .attr("fill", "none")
                        .on("mouseover", function(){
                            let line = d3.select(this),
                                data = JSON.parse(d3.select(this).attr('tooltip-data'));
                            line.attr('old-stroke', line.attr('stroke'));
                            line.attr('stroke', d3.color(line.attr('stroke')).brighter(.4));
                            toolTip.html(`
                                Country: <strong>${data.country.toUpperCase()}</strong><br>
                                Type: <strong>${data.type.toUpperCase()}</strong><br>
                                Hazard: <strong>${data.hazard.toUpperCase()}</strong><br>
                                `);
                            toolTip
                                .transition()
                                .duration(200)
                                .style("opacity", .9)
                                .style("left", (d3.event.pageX + 10) + "px")
                                .style("top", (d3.event.pageY - 60) + "px")
                                .style("visibility", 'visible');
                        })
                        .on("mousemove", toolTipMousemove)
                        .on("mouseout", function(){
                            let line = d3.select(this);
                            line.attr("stroke", line.attr('old-stroke'));
                            toolTip
                                .transition()
                                .duration(100)
                                .style("opacity", 0)
                                .style("visibility", 'hidden');
                        })
                        .on("click", function(d, i){
                            createPreview(pathView, circleView, areaView);
                        });


                    let circleView = circleWrapper.append("g");
                    circleView.selectAll("circle")
                        .data(function(){
                            return datasetH.map(function (e, i) {
                                let newE = $.extend(true, {}, e);
                                newE['data'] = circleData;
                                return newE;
                            });
                        })
                        .enter()
                        .append("circle")
                        .attr("cx", function(d, i) { return xScale(d.displacement); })
                        .attr("cy", function(d, i) { return yScale(d.frequency); })
                        //.style("fill", getColor('line',keyC, keyA, keyH))
                        .attr("fill",
                              hazardsList.length>1?getColorForHazard(null, keyH):getColor('area', keyC, keyC, keyC))
                        .on("click", function(d, i){
                            createPreview(pathView, circleView, areaView);
                        })
                        .on("mouseover", function(d, i){toolTipMouseover(d, i, this);})
                        .on("mousemove", toolTipMousemove)
                        .on("mouseout", function(d, i){
                            toolTipMouseout(d, i, this);
                        });
                };
            };
        };

        if (hazardsList.length > 1){
            hazardsList.forEach(function(h,index){
                let legend = legendWrapper.append("g")
                    .attr('class', 'legend')
                    .attr('transform', function() {
                        var h = 15;
                        var x = width*.65;
                        var y = 50 + index*h;
                    return 'translate(' + x + ',' + y + ')';
                })

                legend.append('path')
                    .attr('d', 'M0,0L20,0')
                    //.attr('width', '20px')
                    .attr('stroke-width', function(){
                        if (h.type === 'prospective'){return 5;}
                        if (h.type === 'retrospective'){return 5;}
                        return 8;
                    })
                    .style('stroke', getColorForHazard(null, h.hazard))
                    //.style('fill', getColor('area', index))
                    //.style('stroke', getColor('line', index))
                    .attr("stroke-dasharray", function(){
                            if (h.type === 'prospective'){return "2,2";}
                            if (h.type === 'retrospective'){return "5,8";}
                            return "";
                        })
                    .on("mouseover", function(){
                        //clipping problem
                        //view.moveToFront();
                    });

                legend.append('text')
                    .attr('x', 1.5*20)
                    .attr('y', 3)
                    .attr('font-size', '10px')
                    .text(h.type.toUpperCase()+' - '+h.hazard.toUpperCase())
                    .on("mouseover", function(){
                        //clipping problem
                        //view.moveToFront();
                    });
            });
        }else{
            countries.forEach(function(d, index){
                let legend = legendWrapper.append("g")
                    .attr('class', 'legend')
                    .attr('transform', function() {
                        var h = 15;
                        var x = width*.75;
                        var y = 50 + index*h;
                    return 'translate(' + x + ',' + y + ')';
                })

                legend.append('rect')
                    .attr('width', '20px')
                    .attr('height', '5px')
                    .style('fill', getColor('area', d, d, d))
                    //.style('stroke', getColor('line', index))
                    .on("mouseover", function(){
                        //clipping problem
                        //view.moveToFront();
                    });

                legend.append('text')
                    .attr('x', 1.5*20)
                    .attr('y', 5)
                    .attr('font-size', '10px')
                    .text(d.toUpperCase())
                    .on("mouseover", function(){
                        //clipping problem
                        //view.moveToFront();
                    });
            });
        }

        // wrapper for buttons for zoom-in, out, reset
        d3.select(documentId)
            .style('position', 'relative')
            .append("div")
            .attr("class", "button-wrapper");

        // define zoom with extend and callback
        let zoom = d3.zoom()
            .scaleExtent([.8, 1000])
            .translateExtent([[-100, -100], [width + 90, height + 100]])
            .on("zoom", zoomed);

        // link zoom with main container
        svg.call(zoom);

        //zoom-in button
        d3.select(documentId)
            .select(".button-wrapper")
            .append("button")
            .html('<i class="fa fa-search-plus"></i>')
            .on("click", function(){
              svg.transition()
                  .duration(250)
                  .call(zoom.scaleBy, 1.3);
            });

        //zoom-out button
        d3.select(documentId)
            .select(".button-wrapper")
            .append("button")
            .html('<i class="fa fa-search-minus"></i>')
            .on("click", function(){
              svg.transition()
                  .duration(250)
                  .call(zoom.scaleBy, .7);
            });

        //zoom-reset button
        d3.select(documentId)
            .select(".button-wrapper")
            .append("button")
            .html('<i class="fa fa-undo"></i>')
            .on("click", function(){
                resetted();
            });

        // zoom-out at the starting for better visibility
        setTimeout(function() {resetted();}, 10);

        // function for zoom transition
        function zoomed() {
          views.forEach(function(view){
              // transform elements(size, position)
              view.attr("transform", d3.event.transform);

              //change size of path and circle as scale(dynamic)
              view.selectAll('path')
                  .style("stroke-width", function(){
                      return d3.select(this).attr("stroke-width")/d3.event.transform.k;
                  });
              view.selectAll("circle")
                  .attr("r", function(){
                      if(d3.event.transform.k < 6){
                          return 0.1;
                      }
                        return 5/d3.event.transform.k;
                  });
          });
          //change axis tick values and structure with axis callback
          gX.call(xAxis.scale(d3.event.transform.rescaleX(xScale)));
          gY.call(yAxis.scale(d3.event.transform.rescaleY(yScale)));
          gYS.call(yAxisS.scale(d3.event.transform.rescaleY(yScaleS)));
          axisLineDot();
        }

        // reset position defined as scale of .9
        function resetted() {
          svg.transition()
              .duration(750)
              .call(zoom.transform, d3.zoomIdentity.scale(.7).translate(50, 200));
              //.call(zoom.transform, d3.zoomIdentity); // zoom to initial postion(x:0,y:0,s:1)
        }

    };

    this.drawBarVertical = function(documentId, datasetC, hazards, showType, barPadding = 1) {

        let dataset = datasetC.slice();
        let yScale = d3.scaleLinear(),
            xScale = d3.scaleBand(),
            labelScale = d3.scaleBand();

        let axisPadding = 1;
        let parent = $(documentId);
        let width = parent.width() -10 ,
            height = parent.height() -10 ,
            padding = 25;

        let yScaleMin = 0,
            yScaleMax = d3.max(dataset, function(data) {
                let max = 0;
                for(let type in data){
                    if(showType.indexOf(type) === -1){continue;}
                    if(data[type]['total'] != undefined){
                        max = Math.max(max, data[type]['total']);
                    }else{
                        let newmax = 0;
                        for(let e in data[type]){
                            newmax += data[type][e];
                        }
                        max = Math.max(max, newmax);
                    }
                }
                return max;
            });

        yScale.domain([yScaleMin, yScaleMax]);
        xScale.domain(dataset.map(function(d){return d.x;}));

        labelScale.domain(
            [].concat.apply([],
                (Object.keys(hazards).map(function(d){
                    return hazards[d];
                })))
        );

        yScale.range([height-padding, axisPadding*padding]);
        xScale.range([axisPadding*padding, width], .9);
        labelScale.range([-30, width-padding]);

        //Clear previous html
        parent.html('');

        let xAxis = d3.axisBottom(xScale)
                    .tickSize(-height+2*padding),
            yAxis = d3.axisLeft(yScale)
                    .tickSize(-width+padding)
                    //.tickSize(1)
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
        if (showType == undefined){
            showType = ['prospective', 'retrospective', 'hybrid'];
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
                    if (showType.indexOf(key.toLowerCase()) === -1) {continue;}
                    let newType = $.extend(true, {}, data[key]);

                    newType['x'] = data['x'];
                    newType['type'] = key;
                    // (-1) remove 'x' key
                    newType['lenofType'] = Object.keys(data).length-1;
                    typeList.forEach(function(d, i){
                        if (showType.indexOf(d.toLowerCase()) == -1) {
                            newType['lenofType'] -= 1;
                        }
                    });
                    newData.push(newType);
                };
                return newData;
            })
            .enter()
            .selectAll("rect")
            .data(function(data) {
                let keys = Object.keys(data),
                    nonKey = ['type', 'x',
                              'lenofType'],
                    skipTotal = false;
                if (keys.length > nonKey.length + 1){
                    nonKey.push('total');
                    if (data.hasOwnProperty('total') && hazards[data.type].indexOf('total') != -1){
                        skipTotal = true;
                    }
                }
                keys = keys.filter(function(d){
                    if (nonKey.indexOf(d.toLowerCase()) == -1){
                        if (hazards[data.type].indexOf(d.toLowerCase()) == -1){return false;}
                        return true;
                    }
                    return false;
                });
                keys.sort(function(a, b){ return data[a]-data[b]; });
                let newDataset =  d3.stack().keys(keys)
                                    .order(d3.stackOrderNone)
                                    .offset(d3.stackOffsetNone)([data]);
                if (skipTotal){
                    newDataset.splice(0, 0, {d:data['total'], key:'total', skip: true, 0:{'data': data}});
                }
                return newDataset;
            })
            .enter()
            //create new rect tag
            .append("rect")
            //configure rect
            .attr("x", function(d) {
                return xScale(d[0].data.x) +
                    (xScale.bandwidth()/d[0].data.lenofType)*showType.indexOf(d[0].data.type.toLowerCase());
            })
            .attr("width", function(d){
                return xScale.bandwidth()/d[0].data.lenofType - barPadding;
            })
            .attr("fill", function(d) {
                return getColorForHazard(labelScale.domain(), d.key);
            })
            .on("mouseover", function(d, i){
                toolTipMouseover(d, i, this);
            })
            .on("mousemove",toolTipMousemove)
            .on("mouseout", function(d, i){
                toolTipMouseout(d, i, this);
            })
            .attr("y", function(d) {
                return yScale.range()[0];
            })
            .transition()
            .duration(2000)
            .attr("y", function(d) {
                if(d.key.toLowerCase() === 'total' && d.skip === true){
                    return yScale(d.d);
                }
                let y1 = d[0][1];
                return yScale(y1);
            })
            .attr("height", function(d) {
                if(d.key.toLowerCase() === 'total' && d.skip === true){
                    return yScale(0) - yScale(d.d);
                }
                let y1 = d[0][1],
                    y0 = d[0][0],
                    diff = yScale(y0) - yScale(y1)
                //diff = diff<=0?-diff:diff;
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
            .attr('x', function(d){return labelScale(d);})
            .attr('width', labelScale.bandwidth()-2)
            .attr('height', '2px')
            .attr('stroke', function(h, i){
                //return getColor('line', i);
            })
            .attr('fill', function(h){
                return getColorForHazard(labelScale.domain(), h);
            });

        legend
            .selectAll("text")
            .data(labelScale.domain())
            .enter()
            .append('text')
            .attr('x', function(d){return labelScale(d);})
            .attr('y', function(d){return -2;})
            .style("font-size", function(d){
                return (Math.min(labelScale.bandwidth()/11, 15)+'px');
            })
            .text(function(d){return d.toProperCase();});

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

    this.drawBar = function(documentId, datasetC, hazards, showType, barPadding = 1) {

        let dataset = datasetC.slice();
        let yScale = d3.scaleBand(),
            xScale = d3.scaleLinear(),
            labelScale = d3.scaleBand();

        let axisPadding = 1;
        let parent = $(documentId);
        let width = parent.width() -10 ,
            height = parent.height() -10 ,
            padding = 25;

        let xScaleMin = 0,
            xScaleMax = d3.max(dataset, function(data) {
                let max = 0;
                for(let type in data){
                    if(showType.indexOf(type) === -1){continue;}
                    if(data[type]['total'] != undefined){
                        max = Math.max(max, data[type]['total']);
                    }else{
                        let newmax = 0;
                        for(let e in data[type]){
                            newmax += data[type][e];
                        }
                        max = Math.max(max, newmax);
                    }
                }
                return max;
            });

        xScale.domain([xScaleMin, xScaleMax+xScaleMax/10]);
        yScale.domain(dataset.map(function(d){return d.x;}));

        labelScale.domain(
            [].concat.apply([],
                (Object.keys(hazards).map(function(d){
                    return hazards[d];
                })))
        );

        yScale.range([height-padding, axisPadding*padding]);
        xScale.range([axisPadding*padding, width], .9);
        labelScale.range([-30, width-padding]);

        //Clear previous html
        parent.html('');

        let xAxis = d3.axisBottom(xScale)
                    .tickSize(-height+2*padding),
                    //.tickFormat(tickFormat),
            yAxis = d3.axisLeft(yScale)
                    .tickSize(-width+padding);

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
        if (showType == undefined){
            showType = ['prospective', 'retrospective', 'hybrid'];
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
                    if (showType.indexOf(key.toLowerCase()) === -1) {continue;}
                    let newType = $.extend(true, {}, data[key]);

                    newType['x'] = data['x'];
                    newType['type'] = key;
                    // (-1) remove 'x' key
                    newType['lenofType'] = Object.keys(data).length-1;
                    typeList.forEach(function(d, i){
                        if (showType.indexOf(d.toLowerCase()) == -1) {
                            newType['lenofType'] -= 1;
                        }
                    });
                    newData.push(newType);
                };
                return newData;
            })
            .enter()
            .selectAll("rect")
            .data(function(data) {
                let keys = Object.keys(data),
                    nonKey = ['type', 'x',
                              'lenofType'],
                    skipTotal = false;
                if (keys.length > nonKey.length + 1){
                    nonKey.push('total');
                    if (data.hasOwnProperty('total') && hazards[data.type].indexOf('total') != -1){
                        skipTotal = true;
                    }
                }
                keys = keys.filter(function(d){
                    if (nonKey.indexOf(d.toLowerCase()) == -1){
                        if (hazards[data.type].indexOf(d.toLowerCase()) == -1){return false;}
                        return true;
                    }
                    return false;
                });
                keys.sort(function(a, b){ return data[a]-data[b]; });
                let newDataset =  d3.stack().keys(keys)
                                    .order(d3.stackOrderNone)
                                    .offset(d3.stackOffsetNone)([data]);
                if (skipTotal){
                    newDataset.splice(0, 0, {d:data['total'], key:'total', skip: true, 0:{'data': data}});
                }
                return newDataset;
            })
            .enter()
            //create new rect tag
            .append("rect")
            //configure rect
            .attr("y", function(d) {
                return yScale(d[0].data.x) +
                    (yScale.bandwidth()/d[0].data.lenofType)*showType.indexOf(d[0].data.type.toLowerCase());
            })
            .attr("height", function(d){
                return yScale.bandwidth()/d[0].data.lenofType - barPadding;
            })
            .attr("fill", function(d) {
                return getColorForHazard(labelScale.domain(), d.key);
            })
            .on("mouseover", function(d, i){
                toolTipMouseover(d, i, this);
            })
            .on("mousemove",toolTipMousemove)
            .on("mouseout", function(d, i){
                toolTipMouseout(d, i, this);
            })
            .attr("x", function(d) {
                return xScale.range()[0];
            })
            .transition()
            .duration(2000)
            .attr("x", function(d) {
                if(d.key.toLowerCase() === 'total' && d.skip === true){
                    return xScale(xScale.domain()[0]);
                }
                return xScale(d[0][0]);
            })
            .attr("width", function(d) {
                if(d.key.toLowerCase() === 'total' && d.skip === true){
                    return xScale(d.d)-xScale(xScale.domain()[0]);
                }
                let y1 = d[0][1],
                    y0 = d[0][0],
                    diff = xScale(y1)-xScale(y0)
                //diff = diff<=0?-diff:diff;
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
            .attr('x', function(d){return labelScale(d);})
            .attr('width', labelScale.bandwidth()-2)
            .attr('height', '2px')
            .attr('stroke', function(h, i){
                //return getColor('line', i);
            })
            .attr('fill', function(h){
                return getColorForHazard(labelScale.domain(), h);
            });

        legend
            .selectAll("text")
            .data(labelScale.domain())
            .enter()
            .append('text')
            .attr('x', function(d){return labelScale(d);})
            .attr('y', function(d){return -2;})
            .style("font-size", function(d){
                return Math.min(labelScale.bandwidth()/11, 15);
            })
            .text(function(d){return d.toProperCase();});

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
