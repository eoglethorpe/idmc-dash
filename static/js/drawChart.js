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

var loadRiskModelaad = function(data){
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

        if (aadDataModel.hasOwnProperty(d.iso3)){
            if (aadDataModel[d.iso3].hasOwnProperty(d.analysis_type)){
                aadDataModel[d.iso3][d.analysis_type][d.hazard] = parseFloat(d.aad);
            }else{
                aadDataModel[d.iso3][d.analysis_type] = {};
                aadDataModel[d.iso3][d.analysis_type][d.hazard] = parseFloat(d.aad);
            }
        }else{
            aadDataModel[d.iso3] = {};
            aadDataModel[d.iso3][d.analysis_type] = {};
            aadDataModel[d.iso3][d.analysis_type][d.hazard] = parseFloat(d.aad);
        }

        if (!aadCountries[d.analysis_type]) {
            aadCountries[d.analysis_type] = {};
        }
        if (!aadCountries[d.analysis_type][d.hazard]) {
            aadCountries[d.analysis_type][d.hazard] = [];
        }
        if (aadCountries[d.analysis_type][d.hazard].indexOf(d.iso3) < 0) {
            aadCountries[d.analysis_type][d.hazard].push(d.iso3);
        }
    });


    filters.reload();
};

var loadRiskModel = function(data, risk){
    let get_hazard = function(d){
        let data =  {
            'frequency': parseFloat(d.frequency),
            'return_period': parseFloat(d.return_period),
            'displacement': parseFloat(d.displacement)
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

var loadAndDrawBarChart = function(countries, hazards, typeList, viewport){
    $(document).ready(function() {
        $.ajax({
            type: "GET",
            url: "static/data/risk_model_aad.csv",
            dataType: "text",
            success: function(data) {
                loadRiskModelaad(data);
                drawAadBar(aadDataModel, hazards, typeList, countries, viewport);
            }
         });
    });
};

var loadAndDrawRiskChart = function(countries, hazards, typeList, viewport){
    $.when(
        $.get('static/data/risk_model_hybrid.csv', function(data){
                loadRiskModel(data, 'hybrid');
        }),
        $.get('static/data/risk_model_prospective.csv', function(data){
                loadRiskModel(data, 'prospective');
        }),
        $.get('static/data/risk_model_retrospective.csv', function(data){
                loadRiskModel(data, 'retrospective');
        })
    ).then(function() {
        drawRiskChart(riskDataModel, hazards, typeList, countries, viewport);
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
,       //"MDG", "MLI", "MOZ", "MRT",
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
                //"landslides",
                //"tectonic","volcanic","total"
            ],
            "hybrid":[
                "total"
            ]
        },
        typeList = ['prospective', 'retrospective', 'hybrid'];

    loadAndDrawBarChart(countries, hazards, typeList, "#viewport-chart");
    loadAndDrawRiskChart(countries, hazards, typeList, '#viewport-graph');

    $('#clear-filter-btn').click(function(){
        filters.clear();
    });
    $('.expand-graph').click(function(){
        console.log('asd');
        drawAadBar(aadDataModel, filters.getSelectedHazards(),
                   filters.getSelectedTypeList(), filters.getSelectedCountry(), "#expanded-viewport");
    });

    $('.countries-select').change(function(){
        drawAadBar(aadDataModel, filters.getSelectedHazards(),
                   filters.getSelectedTypeList(), filters.getSelectedCountry(), "#viewport-chart");
        drawRiskChart(riskDataModel, filters.getSelectedHazards(),
                      filters.getSelectedTypeList(), filters.getSelectedCountry(), "#viewport-graph");
    });
});
