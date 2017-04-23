var csvJSON = function(csv){
  var lines=csv.split("\n");
  var result = [];
  var headers=lines[0].split(",");

  for(var i=1;i<lines.length;i++){

	  var obj = {};
	  var currentline=lines[i].split(",");

	  for(var j=0;j<headers.length;j++){
		  obj[headers[j]] = currentline[j];
	  }
	  result.push(obj);
  }
    return result;
};

var loadRiskModelaad = function(data, code='iso3'){
    let get_aad = function(d){
        return {
            'aad': parseFloat(d.aad),
            'aad_over_pop': parseFloat(d.aad_over_pop)
        };
    }
    filters.reset();

    data = csvJSON(data);
    data.forEach(function(d){
        if (!d.analysis_type) {
            return;
        }

        d.analysis_type = d.analysis_type.toLowerCase();
        d.hazard = d.hazard.toLowerCase();

        // Add hazard types to filters
        filters.addHazardType(d.analysis_type, d.hazard);

        if (aadDataModel.hasOwnProperty(d[code])){
            if (aadDataModel[d[code]].hasOwnProperty(d.analysis_type)){
                aadDataModel[d[code]][d.analysis_type][d.hazard] = get_aad(d);
            }else{
                aadDataModel[d[code]][d.analysis_type] = {};
                aadDataModel[d[code]][d.analysis_type][d.hazard] = get_aad(d);
            }
        }else{
            aadDataModel[d[code]] = {};
            aadDataModel[d[code]][d.analysis_type] = {};
            aadDataModel[d[code]][d.analysis_type][d.hazard] = get_aad(d);
        }
        if(code === 'iso3'){
            if (!aadCountries[d.analysis_type]) {
                aadCountries[d.analysis_type] = {};
            }
            if (!aadCountries[d.analysis_type][d.hazard]) {
                aadCountries[d.analysis_type][d.hazard] = [];
            }
            if (aadCountries[d.analysis_type][d.hazard].indexOf(d[code]) < 0) {
                aadCountries[d.analysis_type][d.hazard].push(d[code]);
            }
        }
        else if(code === 'geographical_group'){
            if (!aadGeoGroups[d.analysis_type]) {
                aadGeoGroups[d.analysis_type] = {};
            }
            if (!aadGeoGroups[d.analysis_type][d.hazard]) {
                aadGeoGroups[d.analysis_type][d.hazard] = [];
            }
            if (aadGeoGroups[d.analysis_type][d.hazard].indexOf(d.geographical_group) < 0) {
                aadGeoGroups[d.analysis_type][d.hazard].push(d.geographical_group);
            }
        }
        else if(code === 'income_group'){
            if (!aadIncomeGroups[d.analysis_type]) {
                aadIncomeGroups[d.analysis_type] = {};
            }
            if (!aadIncomeGroups[d.analysis_type][d.hazard]) {
                aadIncomeGroups[d.analysis_type][d.hazard] = [];
            }
            if (aadIncomeGroups[d.analysis_type][d.hazard].indexOf(d.income_group) < 0) {
                aadIncomeGroups[d.analysis_type][d.hazard].push(d.income_group);
            }
        }
    });
    filters.reload();
};

var loadGeoGroupModel = function(data){
    loadRiskModelaad(data, 'geographical_group');
}

var loadIncomeGroupModel = function(data){
    loadRiskModelaad(data, 'income_group');
}

var loadRiskModel = function(data, risk){
    let get_hazard = function(d){
        let data =  {
            'frequency': parseFloat(d.frequency),
            'return_period': parseFloat(d.return_period),
            'displacement': parseFloat(d.displacement),
            'displacement_over_pop': parseFloat(d.displacement_over_pop),
            'population': parseFloat(d.population)
        }
        if(d.hasOwnProperty('displacement_stat_error')){
            data['displacement_stat_error'] =  parseFloat(d.displacement_stat_error);
        };
        return data;
    };

    data = csvJSON(data);
    data.forEach(function(d){
        if (!d.analysis_type) {
            return;
        }
        d.analysis_type = d.analysis_type.toLowerCase();
        d.hazard = d.hazard.toLowerCase();

        if (riskDataModel.hasOwnProperty(d.iso3)){
            if (riskDataModel[d.iso3].hasOwnProperty(d.analysis_type)){
                if (riskDataModel[d.iso3][d.analysis_type].hasOwnProperty(d.hazard)){
                    riskDataModel[d.iso3][d.analysis_type][d.hazard].push(get_hazard(d));
                }else{
                    riskDataModel[d.iso3][d.analysis_type][d.hazard] = [get_hazard(d)];
                }
            }else{
                riskDataModel[d.iso3][d.analysis_type] = {};
                riskDataModel[d.iso3][d.analysis_type][d.hazard] = [get_hazard(d)];
            }
        }else{
            riskDataModel[d.iso3] = {};
            riskDataModel[d.iso3][d.analysis_type] = {};
            riskDataModel[d.iso3][d.analysis_type][d.hazard] = [get_hazard(d)];
        }

        if (!riskCountries[d.analysis_type]) {
            riskCountries[d.analysis_type] = {};
        }
        if (!riskCountries[d.analysis_type][d.hazard]) {
            riskCountries[d.analysis_type][d.hazard] = [];
        }
        if (riskCountries[d.analysis_type][d.hazard].indexOf(d.iso3) < 0) {
            riskCountries[d.analysis_type][d.hazard].push(d.iso3);
        }
    });

};

var drawRiskChart = function(riskDataModel, hazards, typeList, countries, viewport){
    let labels = ["Tectonic", "Landslides", "Hydrometeorological", "TOTAL"];
    new DrawBarChart().init().drawPath(viewport, riskDataModel, hazards, typeList, countries);
};

var drawAadBar = function(aadDataModel, hazards, typeList, countries, viewport){
    let arrayDataBar = [];
    if( aadDataModel == undefined ) {
        console.log('Error: Load Risk aad Data is not loaded yet');
        return false;
    };
    for(let k in aadDataModel){
        //countries.length > 0 &&
        if(countries.indexOf(k) == -1){continue;};
        let newData = aadDataModel[k];
        newData.x = k;
        arrayDataBar.push(newData);
    }
    new DrawBarChart().init().drawBar(viewport, arrayDataBar, hazards, typeList, 'horizontal');
};

var loadAndDrawBarChart = function(countries, hazards, typeList, viewport, draw=false){
    $(document).ready(function() {
        $.when(
            $.ajax({
                type: "GET",
                url: "static/data/aad.csv",
                dataType: "text",
                success: function(data) {
                    loadRiskModelaad(data);
                }
             }),
             $.ajax({
                 type: "GET",
                 url: "static/data/aad_geo_groups.csv",
                 dataType: "text",
                 success: function(data) {
                    loadGeoGroupModel(data);
                 }
              }),
              $.ajax({
                  type: "GET",
                  url: "static/data/aad_income_groups.csv",
                  dataType: "text",
                  success: function(data) {
                     loadIncomeGroupModel(data);
                  }
               })
        ).then(function(){
            draw?drawAadBar(aadDataModel, hazards, typeList, countries, viewport):'';
        });
    });
};

var loadAndDrawRiskChart = function(countries, hazards, typeList, viewport, draw=false){
    $.when(
        $.get('static/data/hybrid_dec.csv', function(data){
                loadRiskModel(data, 'hybrid');
        }),
        $.get('static/data/prospective_dec.csv', function(data){
                loadRiskModel(data, 'prospective');
        }),
        $.get('static/data/retrospective_dec.csv', function(data){
                loadRiskModel(data, 'retrospective');
        })
    ).then(function() {
        draw?drawRiskChart(riskDataModel, hazards, typeList, countries, viewport):'';
    });
};

$(document).ready(function(){
    let countries =
        [
             //"BDI", "BEN", "BFA", "BWA",
         //"CAF", "CIV", "CMR", "COD",
         //"COG", "COM", "CPV", "DJI",
         //"DZA", "EGY", "ERI", "ESH",
         //"ETH", "GAB", "GHA", "GIN",
         //"GMB", "GNB", "GNQ", "KEN",
         //"LBR", "LBY", "LSO", "MAR",
         //"MDG", "MLI", "MOZ", "MRT",
            "MUS", "MWI",
            "ARG"
        ],
        hazards = {
            "prospective":[
                 "earthquake","flood"
                //,"tsunami","storm","wind"
            ],
            "retrospective":[
                "hydrometeorological",
                 "landslides",
                //"tectonic","volcanic","total"
            ],
            "hybrid":[
                "total"
            ]
        },
        typeList = ['prospective', 'retrospective', 'hybrid'],
    drawInitially = true;

    loadAndDrawBarChart(countries, hazards, typeList, "#viewport-chart", drawInitially);
    loadAndDrawRiskChart(countries, hazards, typeList, '#viewport-graph', drawInitially);

    $('#clear-filter-btn').click(function(){
        filters.clear();
    });
    // $('.expand-graph').click(function(){
    //     console.log('asd');
    //     drawAadBar(aadDataModel, filters.getSelectedHazards(),
    //                filters.getSelectedTypeList(), filters.getSelectedRegions(), "#expanded-viewport");
    // });

    $('.countries-select, .income-group-select, .geo-region-select').change(function(){
        drawAadBar(aadDataModel, filters.getSelectedHazards(),
                    filters.getSelectedTypeList(), filters.getSelectedRegions(), "#viewport-chart");
        drawRiskChart(riskDataModel, filters.getSelectedHazards(),
                    filters.getSelectedTypeList(), filters.getSelectedRegions(), "#viewport-graph");
    });
});
