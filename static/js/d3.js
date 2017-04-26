let tickValuesLog = Array.apply(null, Array(100)).map(function (_, i) {
    return 10**(50-i);
});

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

    var iso3ToShortName = function(iso3){
        if (iso3ToShortNameModel.hasOwnProperty(iso3)){
            return iso3ToShortNameModel[iso3];
        }return iso3;
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
    var tickFormatLog = function(d, node, axis='y'){
        if (powerOfTen(d)){
            if (axis === 'x'){
                return d3.format(",")(d);
            }
            return d3.format(",.5")(d);
            /*
            let tenPower = Math.round(Math.log(d) / Math.LN10),
                sign = '';
            if(tenPower < 0){sign = '⁻'};
            return 10 + sign + formatPower(Math.round(Math.log(d) / Math.LN10));
            */
        }else{
            if (axis === 'x'){
                d3.select(node.parentNode).select('line').attr('class', 'x-minor');
            }else{
                d3.select(node.parentNode).select('line').attr('class', 'y-minor');
            }
        }
        //only show 10^x tick
        //return d3.format(".1s")(d);
    };

    var tickFormat = function(d){
        return d3.format(".2s")(d);
    };

    //for showing info
    var toolTip = !d3.select('div.tooltip').empty()
                ?d3.select('div.tooltip')
                :d3.select("body")
                    .append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);

    var toolTipMouseover = function(d, i, node, overPop=false){
        // for risk upper chart
        if(d.displacement && d.frequency){
            toolTip
                .html((!overPop?'Displacement(X): <strong>'+d3.format(",")(d.displacement)+'</strong>':'')+
                      (overPop?'Displacement Over Population(X): <strong>'+d3.format(",")(getDisplacementData(d.displacement_over_pop, true))+'</strong>':'')+
                      //'<br>Population: <strong>'+d3.format(",")(d.population)+'</strong>'+
                      '<br>Frequency(Y): <strong>'+d3.format(",")(d.frequency)+'</strong>'+
                      '<br>Country: <strong>'+iso3ToShortName(d.data.country)+'</strong>'+
                      '<br>Type: <strong>'+d.data.type.toProperCase()+'</strong>'+
                      '<br>Hazard: <strong>'+d.data.hazard.toProperCase()+'</strong>')
            if(d.hasOwnProperty('displacement_stat_error')){
                toolTip.html(toolTip.html()+
                      '<br>Error: <strong>'+d3.format(",")(d.displacement_stat_error)+'</strong>'
                );
            }
        //for bar chart
        }else if(d[0].data.x){
            toolTip
            .html('Country: '+iso3ToShortName(d[0].data.x)+
                  '<br>Type: <strong>'+d[0].data.type.toProperCase()+'</strong>'+
                  '<br>Hazard: <strong>'+d.key.toProperCase()+'</strong>'+
                  '<br>AAD'+(overPop?' Over Population':'')+': <strong>'+d3.format(",")
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
        if (node){unFadeBar(d3.select(node));}
    }

    let getDisplacementData = function(d, overPop) {
        if (overPop){
            return d*100000;
        }return d;
    };

    // draw upper chart(line chart)
    this.drawPath = function(documentId, dataset, hazards, showType, countries, overPop=false, barPadding = 1) {

        let displacementKey = overPop?'displacement_over_pop':'displacement';
        let yScale = d3.scaleLog(),
            yScaleS = d3.scaleLog(),
            xScale = d3.scaleLog();

        let axisPadding = 1;
        let parent = $(documentId);
        let width = parent.width(),
            height = parent.height(),
            hPadding = 25,
            wPadding = 51;
        parent.width(parent.width());
        parent.height(parent.height());

        let yScaleMin,
            yScaleMax,
            xScaleMin,
            xScaleMax = d3.max(Object.keys(dataset), function(dataC) {
                if (countries.indexOf(dataC) == -1 ){return 0;} // filter with countries
                return d3.max(Object.keys(dataset[dataC]), function(dataA){
                    if (showType.indexOf(dataA) == -1 ){return 0;} // filter with types
                    return d3.max(Object.keys(dataset[dataC][dataA]), function(dataH){
                        if (hazards[dataA].indexOf(dataH) == -1 ){return 0;} // filter with hazards
                        return d3.max(dataset[dataC][dataA][dataH], function(data){
                            if (yScaleMin === undefined){
                                yScaleMin = data.frequency;
                                yScaleMax = data.frequency ;
                                xScaleMin = getDisplacementData(data[displacementKey], overPop) ;
                            }else{
                                yScaleMin = Math.min(yScaleMin, data.frequency);
                                yScaleMax = Math.max(yScaleMax, data.frequency); // y-axis
                                xScaleMin = Math.min(xScaleMin, data.displacement); // y-axis
                            }
                            return getDisplacementData(data[displacementKey], overPop); // x-axis
                        })
                    })
                })
        });
         yScale.domain([0.000005 , yScaleMax]);
        //yScale.domain([yScaleMin, yScaleMax]);
        yScaleS.domain([1/yScale.domain()[0], 1/yScale.domain()[1]]);
        xScale.domain([xScaleMin, xScaleMax]);

        //range according to parent window
        yScale.range([height-hPadding, axisPadding*hPadding]);
        yScaleS.range([height-hPadding, axisPadding*hPadding]);
        xScale.range([axisPadding*wPadding, width-wPadding]);

        //Clear previous html
        parent.html('');
        /*
        parent.on('mousedown', function(){
            $('div').not(this).css('z-index', '100');
            $(this).css('z-index', '1000');
        });
        parent.draggable().resizable().resizable('destroy').resizable();
        */
        parent.append($("<h4></h4>").addClass('graphTitle').html('Displacement Exceedance Curve'));

        let xAxis = d3.axisBottom(xScale)
                    .tickSize(-height+2*hPadding)
                    .tickFormat(function(d){return tickFormatLog(d, this, 'x');}),
                    //.tickValues(tickValuesLog),
            yAxis = d3.axisLeft(yScale)
                    .tickSize(-width+2*wPadding)
                    //.tickValues(tickValuesLog)
                    .tickFormat(function(d){return tickFormatLog(d, this);}),
            yAxisS = d3.axisRight(yScaleS)
                    .tickSize('4')
                    //.tickValues(tickValuesLog)
                    .tickFormat(function(d){return tickFormatLog(d, this);});

        // main container for this chart
        let svg = d3.select(documentId)
            //create svg tag
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", "0 0 "+(width)+" "+(height))
            // for responsive
            .attr("preserveAspectRatio", "xMidYMid meet");

        // group for x-axis
        let gX = svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0,"+ (height-hPadding)+")")
            .attr('clip-path', 'url(#path-x-axis-clip)')
            .call(xAxis);

        // group for y-axis
        let gY = svg.append("g")
            .attr("class", "axis")
            .attr('clip-path', 'url(#path-y-axis-clip)')
            .attr("transform", "translate(" + wPadding + ",0)")
            .call(yAxis);
        let gYS = svg.append("g")
            .attr("class", "axis")
            .attr('clip-path', 'url(#path-y-axis-clip)')
            .attr("transform", "translate(" +(width-wPadding) + ",0)")
            .call(yAxisS);

        // add axis legends
        let axisTitle = svg.append("g")
            .attr('class', 'axisTitle')

        axisTitle.append('text')//y-axis P
            .text('displacement exceedance rate [events/year]')
            .attr('transform',
                'translate(10,'+(height/2)+')rotate(-90)')
        axisTitle.append('text')//y-axis S
            .text('return period [years]')
            .attr('transform',
                'translate('+width+','+(height/2)+')rotate(-90)')
        axisTitle.append('text')//x-axis
            .text('displaced [people'+(overPop?' per 100,000 inhabitants]':']'))
            .attr('transform',
                'translate('+(width/2)+','+(height)+')')

        // Clipping window for inner line, area, circle and other node
        let defsClip = svg.append('defs');

        defsClip.append('clipPath')
            .attr('id', 'path-clip')
            .append('rect')
            .attr('x', wPadding)
            .attr('y', hPadding)
            .attr('width', width - 2*wPadding)
            .attr('height', height - 2*hPadding);
        defsClip.append('clipPath')
            .attr('id', 'path-x-axis-clip')
            .append('rect')
            .attr('x', wPadding)
            .attr('y', -height+hPadding)
            .attr('width', width - 2*wPadding)
            .attr('height', height);
        defsClip.append('clipPath')
            .attr('id', 'path-y-axis-clip')
            .append('rect')
            .attr('x', -wPadding)
            .attr('y', hPadding)
            .attr('width', width)
            .attr('height', height - 2*hPadding);

        // function to generate lines
        var lineFunction = d3.line()
                             .x(function(d, i) {
                                 return xScale(getDisplacementData(d[displacementKey], overPop));
                             })
                             .y(function(d, i) { return yScale(d.frequency); }),
        // function to generate area
            CAreaFunction = d3.area()
                .x(function(d){return xScale(getDisplacementData(d[displacementKey], overPop));})
                .y0(function(d){return yScale(d.frequency+d.displacement_stat_error);})
                .y1(function(d){return yScale(d.frequency-d.displacement_stat_error);}),

        // function to generate preview(Preview is front of all the other nodes)
            createPreview = function(pathView, fullPathView, circleView, areaView){
                // move node to previous wrapper
                var reAppendChildren = function(){
                    let previewCircle = previewWrapper.select('g').node(),
                        previewLine = previewWrapper.select('path.risk-line').node(),
                        previewFullLine = previewWrapper.select('path.risk-line-full').node();
                    if (previewCircle) {circleWrapper.node().appendChild(previewCircle)};
                    if (previewLine) {pathWrapper.node().appendChild(previewLine)};
                    if (previewFullLine) {fullPathWrapper.node().appendChild(previewFullLine)};
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
                previewWrapper.node().appendChild(fullPathView.node());
                previewWrapper.node().appendChild(circleView.node());

                previewWrapper.on("click", function(){
                    reAppendChildren();
                });
            },
            pathTooltipInfo = function(data){
                toolTip.html(`
                    Country: <strong>${iso3ToShortName(data.country)}</strong><br>
                    Type: <strong>${data.type.toProperCase()}</strong><br>
                    Hazard: <strong>${data.hazard.toProperCase()}</strong><br>
                    `);
                toolTip
                    .transition()
                    .duration(200)
                    .style("opacity", .9)
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY - 60) + "px")
                    .style("visibility", 'visible');
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
            fullPathWrapper = clipWrapper.append("g").attr('class', 'fullPathWrapper'), //for lines
            circleWrapper = clipWrapper.append("g").attr('class', 'circleWrapper'), // for circles(points)
            previewWrapper = clipWrapper.append("g").attr('class', 'previewWrapper'), // for preview
            legendWrapper = clipWrapper.append("g").attr('class', 'legendWrapper'); // for legends

        // to pass zoom transition, see zoom callback
        views.push(areaWrapper);
        views.push(pathWrapper);
        views.push(fullPathWrapper);
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

                    let areaView = null,
                        pathView = pathWrapper.append("path"),
                        fullPathView = fullPathWrapper.append("path"),
                        circleView = circleWrapper.append("g");

                    if (datasetH.length && datasetH[0].hasOwnProperty('displacement_stat_error')){
                        // draw area if error is provided in the data
                        areaView = areaWrapper.append("path")
                                //.attr("d", CAreaFunction(datasetH))
                                .attr('class', 'risk-error-area')
                                .attr("fill", getColor('area', keyC, keyA, keyH))
                                .style("opacity", 0.4);
                    }

                    let circleData = {'country': keyC, 'type': keyA, 'hazard': keyH},
                        lineData = lineFunction(datasetH);

                    pathView
                        .attr("d", lineData)
                        .attr('class', 'risk-line')
                        .attr("stroke",
                            hazardsList.length>1?getColorForHazard(null, keyH):getColor('area', keyC, keyC, keyC))
                        .attr("stroke-width", 5)
                        .attr("stroke-dasharray", function(){
                            if (hazardsList.length === 1) {return "";}
                            if (keyA === 'prospective'){return "2,2";}
                            if (keyA === 'retrospective'){return "5,8";}
                            return "";
                        })
                        .attr("fill", "none")
                        .on("mouseover", function(){
                            let line = d3.select(this);
                            line.attr('old-stroke', line.attr('stroke'));
                            line.attr('stroke', d3.color(line.attr('stroke')).brighter(.4));
                        })
                        .on("mousemove", toolTipMousemove)
                        .on("mouseout", function(){
                            let line = d3.select(this);
                            line.attr("stroke", line.attr('old-stroke'));
                        });

                    fullPathView.attr("class", "risk-line-full")
                        .attr("d", lineData)
                        .attr("tooltip-data", JSON.stringify(circleData))
                        .attr("stroke-width", 10)
                        .attr("stroke", "black")
                        .attr("fill", "none")
                        .style("opacity", 0)
                        .on("mousemove", toolTipMousemove)
                        .on("mouseover", function(){
                            pathTooltipInfo(JSON.parse(d3.select(this).attr('tooltip-data')));
                        })
                        .on("mouseout", function(){
                            toolTipMouseout();
                        }).on("click", function(d, i){
                            createPreview(pathView, fullPathView, circleView, areaView);
                        });

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
                        .attr("cx", function(d, i) { return xScale(getDisplacementData(d[displacementKey], overPop)); })
                        .attr("cy", function(d, i) { return yScale(d.frequency); })
                        .attr("fill",
                              hazardsList.length>1?getColorForHazard(null, keyH):getColor('area', keyC, keyC, keyC))
                        .on("click", function(d, i){
                            createPreview(pathView, fullPathView, circleView, areaView);
                        })
                        .on("mouseover", function(d, i){toolTipMouseover(d, i, this, overPop);})
                        .on("mousemove", toolTipMousemove)
                        .on("mouseout", function(d, i){
                            toolTipMouseout(d, i, this);
                        });
                };
            };
        };

        let drawLegends = function(legendWrapper, legendArray, legendIsH,
                                   total, perPage, cPage){
            legendWrapper.selectAll("*").remove();
            let legendBackG = legendWrapper.append("g")
                    .append('rect'),
                sIndex = Math.floor((perPage)*(cPage-1)),
                eIndex = -1;
            if (!legendIsH){// for countries list
                eIndex += 1 ;
                legendWrapper.append("g")
                    .attr('class', 'legend')
                    .attr('transform', function() {
                        let y = 0;
                        return 'translate(0,' + y + ')';
                })
                .append('text')
                    .attr('y', 5)
                    .attr('font-size', '10px')
                    .attr('font-anchor', 'center')
                    .text(hazardsList[0]?hazardsList[0].type.toProperCase()+' - ' + hazardsList[0].hazard.toProperCase()
                    :'No Hazard Selected')
                    .on("mouseover", function(){
                        //clipping problem
                        //view.moveToFront();
                    });
            };

            legendArray.forEach(function(d,index){
                if (!(index >= sIndex && index < sIndex+perPage)){return;};
                eIndex += 1;
                let legend = legendWrapper.append("g")
                    .attr('class', 'legend')
                    .attr('transform', function() {
                        var y = (eIndex)*15;
                        return 'translate(0,' + y + ')';
                });

                if (legendIsH){
                    legend.append('path')
                        .attr('d', 'M0,0L20,0')
                        .attr('stroke-width', function(){
                            return 5;
                            /*
                            if (d.type === 'prospective'){return 3;}
                            if (d.type === 'retrospective'){return 3;}
                            return 3;
                            */
                        })
                        .style('stroke', getColorForHazard(null, d.hazard))
                        .attr("stroke-dasharray", function(){
                                if (d.type === 'prospective'){return "2,2";}
                                if (d.type === 'retrospective'){return "5,8";}
                                return "";
                            })
                        .on("mouseover", function(){
                            //view.moveToFront();
                        });
                }else{
                    legend.append('rect')
                        .attr('width', '20px')
                        .attr('height', '3px')
                        .style('fill', getColor('area', d, d, d))
                        .on("mouseover", function(){
                            //view.moveToFront();
                        });
                }

                legend.append('text')
                    .attr('x', 1.5*20)
                    .attr('y', 5)
                    .attr('font-size', '10px')
                    .text(legendIsH?d.type.toProperCase()+' - '+d.hazard.toProperCase()
                         :iso3ToShortName(d))
                    .on("mouseover", function(){
                    });
            });

            if (total/perPage > 1){
                eIndex += 1;
                let pageNav = legendWrapper.append("g")
                    .attr('class', 'legend-page-navigation')
                    .attr('transform', function() {
                        var y = (eIndex)*15;
                        return 'translate(0,' + y + ')';
                    })
                if (cPage > 1){
                    let back = pageNav.append('rect');
                    let text = pageNav
                        .append('text')
                        .attr('x', 4)
                        .attr('y', 16)
                        .attr('font-size', '13px')
                        .html('&#xf100 Previous')
                        .on('click', function(){
                            drawLegends(legendWrapper, legendArray, legendIsH,
                                        legendArray.length, legendPerPage, cPage-1);
                        });
                    back.attr('x', 0)
                        .attr('y', 16 - text.node().getBBox().height)
                        .attr('fill', '#fff')
                        .attr('stroke-width', 1)
                        .attr('stroke', 'rgba(0, 0, 0, 0.2)')
                        .attr('width', text.node().getBBox().width + 16)
                        .attr('height', text.node().getBBox().height + 8)
                        .on('click', function(){
                            drawLegends(legendWrapper, legendArray, legendIsH,
                                        legendArray.length, legendPerPage, cPage-1);
                        });
                }if (cPage < total/perPage){
                    let back = pageNav.append('rect');
                    let text = pageNav
                        .append('text')
                        .attr('x', cPage>1?102:0)
                        .attr('y', 16)
                        .attr('font-size', '13px')
                        .html('Next &#xf101')
                        .on('click', function(){
                            drawLegends(legendWrapper, legendArray, legendIsH,
                                        legendArray.length, legendPerPage, cPage+1);
                        });
                    back.attr('x', cPage>1?98:-4)
                        .attr('y', 16 - text.node().getBBox().height)
                        .attr('fill', '#fff')
                        .attr('stroke-width', 1)
                        .attr('stroke', 'rgba(0, 0, 0, 0.2)')
                        .attr('width', text.node().getBBox().width + 16)
                        .attr('height', text.node().getBBox().height + 8)
                        .on('click', function(){
                            drawLegends(legendWrapper, legendArray, legendIsH,
                                        legendArray.length, legendPerPage, cPage+1);
                        });
                }
            }
            legendBackG
                .attr('fill', '#000')
                .attr('opacity', 0.05)
                .attr('x', -legendPadding)
                .attr('y', -legendPadding)
                .attr('width', legendWrapper.node().getBBox().width + 2*legendPadding)
                .attr('height', legendWrapper.node().getBBox().height + 2*legendPadding);

            legendWrapper.attr('transform', function(){
                    var y = hPadding + 2*legendPadding;
                    var x = width - legendBackG.node().getBBox().width - wPadding;
                    return 'translate(' + x + ',' + y + ')';
            });
        }
        let legendPadding = 15,
            legendPerPage = 11,
            legendIsH = hazardsList.length>1?true:false,
            legendArray = hazardsList.length>1?hazardsList:countries,
            legendPages = legendArray.length/legendPerPage;

        drawLegends(legendWrapper, legendArray, legendIsH,
                    legendArray.length, legendPerPage, 1);
        // wrapper for buttons for zoom-in, out, reset
        d3.select(documentId)
            .style('position', 'relative')
            .append("div")
            .attr("class", "button-wrapper");

        // define zoom with extend and callback
        let zoom = d3.zoom()
            .scaleExtent([.4, 10])
            .translateExtent([[-500, -500], [width + 500, height + 500]])
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

        let dataSelection = d3.select(documentId)
            .select(".button-wrapper")
            .append("div")
            .attr('class','data-select');

        dataSelection
            .append('label')
            .attr('class', !overPop?'active':'')
            .on('click', function(){
                if (overPop){
                    new DrawBarChart().init().drawPath(documentId, dataset, hazards,
                                                       showType, countries, false, barPadding);
                }
            })
            .html('Absolute')
            .append("input")
            .attr('type', 'radio')
            .attr('name', 'data-selection')
            .attr('value', 'Absolute');

        dataSelection
            .append('label')
            .attr('class', overPop?'active':'')
            .on('click', function(){
                if (!overPop){
                    new DrawBarChart().init().drawPath(documentId, dataset, hazards,
                                                       showType, countries, true, barPadding);
                }
            })
            .html('Relative')
            .append("input")
            .attr('type', 'radio')
            .attr('name', 'data-selection')
            .attr('value', 'Relative');

        /*
         d3.select(documentId)
             .select(".button-wrapper")
             .append("button")
             .html('<i class="fa fa-expand expand-graph"></i>')
             .on("click", function(){
                  $('footer').show();
                  drawRiskChart(riskDataModel, filters.getSelectedHazards(),
                                filters.getSelectedTypeList(), filters.getSelectedCountry(), "#expanded-viewport");
             });
         */

        // zoom-out at the starting for better visibility
        /*
        setTimeout(function() {
            svg.transition()
                .duration(750)
                .call(zoom.scaleBy, 0.7);
        }, 10);
        */

        // function for zoom transition
        function zoomed() {
          views.forEach(function(view){
              // transform elements(size, position)
              view.attr("transform", d3.event.transform);

              //change size of path and circle as scale(dynamic)
              view.selectAll('path')
                  .style("stroke-width", function(){
                      return d3.select(this).attr("stroke-width")/d3.event.transform.k;
                  }).style("stroke-dasharray", function(){
                    let dasharray = d3.select(this).attr("stroke-dasharray");
                    if (dasharray){
                        dasharray = dasharray.split(',');
                        if (dasharray.length === 2){
                            return parseFloat(dasharray[0])/d3.event.transform.k+
                                    ','+ parseFloat(dasharray[1])/d3.event.transform.k ;
                    }}return '';
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
        }

        // reset position defined as scale of .9
        function resetted() {
          svg.transition()
              .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
              //.call(zoom.transform, d3.zoomIdentity); // zoom to initial postion(x:0,y:0,s:1)
        }

    };

    this.drawBar = function(documentId, datasetC, hazards, showType, layout="vertical", overPop=false, barPadding = 1) {

        let vLayout = layout.toUpperCase() === 'VERTICAL'?true:false;
        let aadKey = overPop?'aad_over_pop':'aad';
        let dataset = datasetC.slice();
        let yScale = d3.scaleBand(),
            xScale = d3.scaleLinear(),
            //legends
            labelScale = d3.scaleBand();

        let axisPadding = 1;
        let parent = $(documentId);
        let width = parent.width() -10 ,
            height = parent.height() -10 ,
            paddingWR = 5,
            paddingH = 25,
            paddingWL = 30;
        parent.width(parent.width());
        parent.height(parent.height());

        let xScaleMin = 0,
            xScaleMax = d3.max(dataset, function(data) {
                let max = 0;
                for(let type in data){
                    if(showType.indexOf(type) === -1){continue;}
                    if(data[type]['total'] != undefined){
                        max = Math.max(max, getDisplacementData(data[type]['total'][aadKey], overPop));
                    }else{
                        let newmax = 0;
                        for(let e in data[type]){
                            newmax += getDisplacementData(data[type][e][aadKey], overPop);
                        }
                        max = Math.max(max, newmax);
                    }
                }
                return max;
            });

        let axisTextSvg = d3.select("body")
            .append("svg"),
        axisTick = axisTextSvg.append("g").attr("class", "axis")
            .append("g").attr("class", "tick");

        xScale.domain([xScaleMin, xScaleMax+xScaleMax/10]);
        yScale.domain(dataset.map(function(d){
            if (!vLayout){
                // for calculation padding for y-axis labels (country)
                axisTick
                    .append("text")
                    .text(iso3ToShortName(d.x))
            }
            return d.x;
        }));
        if (!vLayout){
            paddingWL = axisTextSvg.node().getBBox().width+5;
        }
        axisTextSvg.remove();

        labelScale.domain(
            [].concat.apply([],
                (Object.keys(hazards).map(function(d){
                    if (showType.indexOf(d.toLowerCase()) != -1){
                        return hazards[d];
                    }return [];
                })))
        );

        if (vLayout){
            xScale.range([height-paddingH, axisPadding*paddingH]);
            yScale.range([axisPadding*paddingWL, width-paddingWR], .9);
        }else{
            yScale.range([height-paddingH, axisPadding*paddingH]);
            xScale.range([axisPadding*paddingWL, width-paddingWR], .9);
        }
        labelScale.range([0, width-paddingWR]);

        //Clear previous html
        parent.html('');
        /*
        parent.on('mousedown', function(){
            $('div').not(this).css('z-index', '100');
            $(this).css('z-index', '1000');
        });
        parent.draggable().resizable().resizable('destroy').resizable();
        */
        parent.append($("<h4></h4>").addClass('graphTitle').html('Average Annual Displacement'));

        let xAxis = d3.axisBottom(vLayout?yScale:xScale)
                    .tickSize(-height+2*paddingH),
                    //.tickFormat(tickFormat),
            yAxis = d3.axisLeft(vLayout?xScale:yScale)
                    .tickSize(-width+paddingWR)
                    .tickFormat(function(d){return iso3ToShortName(d);});
        if (vLayout){
            xAxis.tickFormat(function(d){
                return iso3ToShortName(d);
            });
            yAxis.tickFormat(function(d){
                return d3.format(",")(d);});
        }else{
            yAxis.tickFormat(function(d){
                return iso3ToShortName(d);
            });
            xAxis.tickFormat(function(d){
                return d3.format(",")(d);});
        }

        let svg = d3.select(documentId)
            //create svg tag
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", "0 0 "+width+" "+height)
            .attr("preserveAspectRatio", "xMidYMid meet");

        let gX = svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0,"+ (height-paddingH)+")")
            .call(xAxis);

        let gY = svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + paddingWL + ",0)")
            .call(yAxis);

        let axisTitle = svg.append("g")
            .attr('class', 'axisTitle')

        axisTitle.append('text')//x-axis
            .text('average annual displacement [people'+(overPop?' per 100,000 inhabitants]':']'))
            .attr('transform',
                'translate('+(width/2)+','+(height)+')')

        // Clipping
        svg.append('defs')
            .append('clipPath')
            .attr('id', 'bar-clip')
            .append('rect')
            .attr('x', paddingWL)
            .attr('y', paddingH)
            .attr('width', width - paddingWL - paddingWR)
            .attr('height', height - 2*paddingH);

        let view = svg.append("g")
                .attr('class', 'main')
                .attr('clip-path', 'url(#bar-clip)');

        //Types to show i.e 'Prospective', 'Retrospective', 'Hybrid'
        if (showType == undefined){
            //showType = ['prospective', 'retrospective', 'hybrid'];
            showType = [];
        };
        // for each data draw bar
        let labelView = view.append("g"),
            barData = view.append("g")
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
                keys.forEach(function(d){
                    if (hazards[data.type].indexOf(d.toLowerCase()) != -1){
                        data[d] = getDisplacementData(data[d][aadKey], overPop);
                    }
                });
                keys.sort(function(a, b){ return getDisplacementData(data[a][aadKey]-data[b][aadKey], overPop); });
                let newDataset =  d3.stack().keys(keys)
                                    .order(d3.stackOrderNone)
                                    .offset(d3.stackOffsetNone)([data]);
                if (skipTotal){
                    newDataset.splice(0, 0, {d:getDisplacementData(data['total'][aadKey], overPop), key:'total', skip: true, 0:{'data': data}});
                }
                return newDataset;
            })
            .enter()
            //create new rect tag
            .append("rect")
            //configure rect
            .attr(vLayout?"x":"y", function(d) {
                return yScale(d[0].data.x) +
                    (yScale.bandwidth()/d[0].data.lenofType)*showType.indexOf(d[0].data.type.toLowerCase());
            })
            .attr(vLayout?"width":"height", function(d){
                return yScale.bandwidth()/d[0].data.lenofType - barPadding;
            })
            .attr("fill", function(d) {
                return getColorForHazard(labelScale.domain(), d.key);
            })
            .on("mouseover", function(d, i){
                toolTipMouseover(d, i, this, overPop);
            })
            .on("mousemove",toolTipMousemove)
            .on("mouseout", function(d, i){
                toolTipMouseout(d, i, this);
            })
            .attr(vLayout?"y":"x", function(d) {
                return xScale.range()[0];
            })
            .transition()
            .duration(2000)
            .attr(vLayout?"y":"x", function(d) {
                if(d.key.toLowerCase() === 'total' && d.skip === true){
                    return vLayout?xScale(d.d)
                                  :xScale(xScale.domain()[0]);
                }
                return xScale(d[0][vLayout?1:0]);
            })
            .attr(vLayout?"height":"width", function(d) {
                if(d.key.toLowerCase() === 'total' && d.skip === true){
                    return vLayout?xScale(0)-xScale(d.d)
                        :xScale(d.d)-xScale(xScale.domain()[0]);
                }
                let y1 = d[0][1],
                    y0 = d[0][0],
                    diff = vLayout?xScale(y0)-xScale(y1):xScale(y1)-xScale(y0)
                //diff = diff<=0?-diff:diff;
                return diff;
            }).attr('', function(d){
                /*
                let rect = d3.select(this);
                setTimeout(function(){
                    labelView.append('text')
                        .text(d3.format(',.7')(d[0][1]-d[0][0]))
                        .attr('font-size', (yScale.bandwidth()/d[0].data.lenofType)*.50)
                        .attr(vLayout?'x':'y', parseFloat(rect.attr(vLayout?'x':'y')) + (yScale.bandwidth()/d[0].data.lenofType)*.75)
                        .attr(vLayout?'y':'x', parseFloat(rect.attr(vLayout?'y':'x'))+parseFloat(rect.attr(vLayout?'height':'width')))
                        .attr('fill', function(d){
                            return 'black';
                        });
                }, 2000);
                */
            });

        labelView.moveToFront();
        let legend = svg.append("g")
                .attr('class', 'legend')
                .attr('transform', function(d) {
                    var x = 0;
                    var y = paddingH - 4;
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
            .append('g')
            .attr('transform', function(d){return 'translate('+labelScale(d)+',-2)';})
            .append('text')
            //.attr('x', function(d){return labelScale(d);})
            //.attr('y', function(d){return -2;})
            /*
            .style("font-size", function(d){
                return Math.min(labelScale.bandwidth()/9, 15);
            })
            */
            .text(function(d){return d.toProperCase();})
            .attr('transform', function(d){
                let scaleBy = (labelScale.bandwidth()/(d3.select(this).node().getBBox().width+5));
                return 'scale('+Math.min(2, scaleBy)+')';
            });

        let dataSelection = d3.select(documentId)
                .style('position', 'relative')
                .append("div")
                .attr("class", "button-wrapper")
                .append("div")
                .attr('class','data-select');

        dataSelection
            .append('label')
            .attr('class', !overPop?'active':'')
            .on('click', function(){
                if (overPop){
                    new DrawBarChart().init().drawBar(documentId, datasetC, hazards,
                                                      showType, layout, false, barPadding);
                }
            })
            .html("Absolute")
            .append("input")
            .attr('type', 'radio')
            .attr('name', 'data-selection')
            .attr('value', 'Absolute');

        dataSelection
            .append('label')
            .attr('class', overPop?'active':'')
            .on('click', function(){
                if (!overPop){
                    new DrawBarChart().init().drawBar(documentId, datasetC, hazards,
                                                      showType, layout, true, barPadding);
                }
            })
            .html("Relative")
            .append("input")
            .attr('type', 'radio')
            .attr('name', 'data-selection')
            .attr('value', 'Relative');

        let gXSize = gX.selectAll('.tick text').size();
        if (vLayout && gXSize > 25){
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
