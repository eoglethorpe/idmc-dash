var DrawBarChart = function(){

    this.init = function(){

        d3.selection.prototype.moveToFront = function() {
          return this.each(function(){
            this.parentNode.appendChild(this);
          });
        };
        return this;
    };

    colorsLine = [ "rgb(114, 147, 203)", "rgb(225, 151, 76)",
                       "rgb(132, 186, 91)", "rgb(211, 94, 96)",
                       "rgb(128, 133, 133)", "rgb(144, 103, 167)",
                       "rgb(171, 104, 87)", "rgb(204, 194, 16)"];

    colorsArea = [ "rgb(57, 106, 177)", "rgb(218, 124, 48)",
                       "rgb(62, 150, 81)", "rgb(204, 37, 41)",
                       "rgb(83, 81, 84)", "rgb(107, 76, 154)",
                       "rgb(146, 36, 40)", "rgb(148, 139, 61)"];


    getColor = function(type, index){
        if (type == 'area'){
            index = index % colorsArea.length;
            return colorsArea[index];
        }else if(type == 'line'){
            index = index % colorsLine.length;
            return colorsLine[index];
        }
    };

    fadeBar = function(bar){
        bar.attr('old-color', bar.style("fill"));
        let newColor = d3.color(bar.attr('old-color'));
        newColor.g = 150;
        newColor.b = 150;
        bar.style("fill", newColor);
    };

    unFadeBar = function(bar){
        bar.style("fill", bar.attr('old-color'));
    };

    readablizeNumber = function(number) {
        var s = ['', 'k', 'M', 'B'];
        var e = Math.floor(Math.log(number) / Math.log(1000));
        return (number / Math.pow(1000, e)).toFixed(0) + "" + s[e];
    };

    superscript = "⁰¹²³⁴⁵⁶⁷⁸⁹";
    powerOfTen = function(d) {
          return d / Math.pow(10, Math.ceil(Math.log(d) / Math.LN10 - 1e-12)) === 1;
    };
    formatPower = function(d) {
        return (d + "").split("").map(function(c) {
                return superscript[c];
            }).join("");
    };
    tickFormatLog = function(d){
        if (powerOfTen(d)){
            let tenPower = Math.round(Math.log(d) / Math.LN10),
                sign = '';
            if(tenPower < 0){sign = '⁻'};
            return 10 + sign + formatPower(Math.round(Math.log(d) / Math.LN10));
        }
        //return d3.format(".1s")(d);
    };

    tickFormat = function(d){
        return d3.format(".3s")(d);
        //if (d == 0){ return 0}
        //if (d <= 0){ return '-'+readablizeNumber(d*-1);}
        //return readablizeNumber(d);
    };

    this.drawPath = function(documentId, dataset, labels, errorBand=false, barPadding = 1) {

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

        let toolTip = d3.select("body")
                        .append("div")
                        .attr("class", "tooltip")
                        .style("opacity", 0);

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
            .attr('id', 'clip')
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

        let mouseover = function(d, i){
            if(d.x && d.y){
                toolTip
                    .html('X: '+d.x+'<br>Y: <strong>'+d.y+'</strong>')
                    .transition()
                    .duration(200)
                    //.style("background", d3.select(this).style("fill"))
                    .style("opacity", .9)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            };
            fadeBar(d3.select(this));
        },
        mousemove = function(d, i){
            if(d.x && d.y){
                toolTip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
            }
        },
        mouseout = function(d, i){
            unFadeBar(d3.select(this));
            if(d.x && d.y){
                toolTip
                    .transition()
                    .duration(500)
                    .style("opacity", 0);
            };
        }

        //used for label

        //used by zoom
        let views = [];
        let pathWrapper = svg.append("g");
        let legendWrapper = svg.append("g");

        // for each data draw lines and area
        dataset.forEach(function(dataset, index){
            let view = pathWrapper.append("g")
                .attr('class', 'main')
                .attr('clip-path', 'url(#clip)');

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
                .on("mouseover", mouseover)
                .on("mousemove", mousemove)
                .on("mouseout", mouseout);

            legend = legendWrapper.append("g")
                .attr('class', 'legend')
                .attr('transform', function(d) {
                    var h = 30;
                    var x = width*.79;
                    var y = 80 + index*h;
                return 'translate(' + x + ',' + y + ')';
            })

            legend.append('rect')
                .attr('width', '20px')
                .attr('height', '2px')
                .style('fill', getColor('area', index))
                .style('stroke', getColor('line', index))
                .on("mouseover", function(){
                    //clipping problem
                    //view.moveToFront();
                });

            legend.append('text')
                .attr('x', 1.5*20)
                .attr('y', 5)
                .attr('fontSize', '20px')
                .text(labels[index])
                .on("mouseover", function(){
                    //clipping problem
                    //view.moveToFront();
                });

            views.push(pathView)
            views.push(circle)
        });

        d3.select(documentId)
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

        let resetButtonG = d3.select(documentId)
            .select(".button-wrapper")
            .append("button")
            .text("Reset")
            .on("click", function(){
                return resetted();
            })
            */

        let zoom = d3.zoom()
            .scaleExtent([1, 40])
            .translateExtent([[-100, -100], [width + 90, height + 100]])
            .on("zoom", zoomed);

        svg.call(zoom);

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
              .call(zoom.transform, d3.zoomIdentity);
        }

    };

    this.drawBar = function(documentId, dataset, barPadding = 1) {

        dataset.sort(function(d1, d2){return d1.x - d2.x});

        let yScale = d3.scaleLog(),
            xScale = d3.scaleBand();

        let axisPadding = 1;
        let parent = $(documentId);
        let width = parent.width() -10 ,
            height = parent.height() -10 ,
            fontSize = ((parent.width()/(4*dataset.length))-barPadding)
                       .toFixed(),
            padding = 25;

        let toolTip = d3.select("body")
                        .append("div")
                        .attr("class", "tooltip")
                        .style("opacity", 0);

        // y - axis Value scale
        yScale.domain([0.1, d3.max(dataset, function(data) {
            return data.y;
        })]);
        // x - axis scale
        xScale.domain(dataset.map(function(d){return d.x;}));

        yScale.range([height-padding, axisPadding*padding]);
        xScale.range([axisPadding*padding, width], .9);

        //Clear previous html
        parent.html('');

        let xAxis = d3.axisBottom(xScale),
            yAxis = d3.axisLeft(yScale)
                    .tickSize(-width+padding)
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
            .attr('id', 'clip')
            .append('rect')
            .attr('x', padding)
            .attr('y', padding)
            .attr('width', width - padding)
            .attr('height', height - 2*padding);

        //for showing info on mouse over
        let mouseover = function(d, i){
            if(d.x && d.y){
                toolTip
                    .html('X: '+d.x+'<br>Y: <strong>'+d.y+'</strong>')
                    .transition()
                    .duration(200)
                    //.style("background", d3.select(this).style("fill"))
                    .style("opacity", .9)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            };
            fadeBar(d3.select(this));
        },
        mousemove = function(d, i){
            if(d.x && d.y){
                toolTip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
            }
        },
        mouseout = function(d, i){
            unFadeBar(d3.select(this));
            if(d.x && d.y){
                toolTip
                    .transition()
                    .duration(500)
                    .style("opacity", 0);
            };
        }
        let view = svg.append("g")
                .attr('class', 'main')
                .attr('clip-path', 'url(#clip)');

        // for each data draw bar
        let barView = view.append("g")
            .selectAll("rect")
            .data(dataset)
            .enter()
            //create new rect tag
            .append("rect")
            //configure rect
            .attr("x", function(d) {
                return xScale(d.x);
            })
            .attr("y", function(d) {
                if(d.y==0){return d.y;}
                return yScale(d.y);
            })
            .attr("width", function(d){
                return xScale.bandwidth() - barPadding;
            })
            .attr("height", function(d) {
                if(d.y==0){return d.y;}
                return height - yScale(d.y) - axisPadding*padding;
            })
            .attr("fill", function(d) {
                return "blue";
            })
            .on("mouseover", mouseover)
            .on("mousemove",mousemove)
            .on("mouseout", mouseout);

        d3.select(documentId)
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

        let resetButtonG = d3.select(documentId)
            .select(".button-wrapper")
            .append("button")
            .text("Reset")
            .on("click", function(){
                return resetted();
            })
        */

        let zoom = d3.zoom()
            .scaleExtent([1, 40])
            .translateExtent([[-100, -100], [width + 90, height + 100]])
            .on("zoom", zoomed);

        svg.call(zoom);

        function zoomed() {
          barView.attr("transform", d3.event.transform);
          gY.call(yAxis.scale(d3.event.transform.rescaleY(yScale)));
          gX.call(xAxis.scale(xScale.copy().range(
                xScale.range().map(d3.event.transform.applyX, d3.event.transform))));
          axisLineDot();
        }

        function resetted() {
          svg.transition()
              .duration(750)
              .call(zoom.transform, d3.zoomIdentity);
        }

    };
};
