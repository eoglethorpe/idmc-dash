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

var draw = function() {
    let dataPath = [
            [
                [1.5, 0.6666666667, 3, 0.2611164839],
                [1.5, 0.6666666667, 4, 0.2611164839],
                [1.0909090909, 0.9166666667, 5, 0.2226808857],
                [0.8181818182, 1.2222222222, 10, 0.192847304],
                [0.6818181818, 1.4666666667, 20, 0.1760446976],
                [0.3636363636, 2.75, 50, 0.1285648693],
                [0.1818181818, 5.5, 100, 0.0909090909],
                [0.0909090909, 11, 200, 0.0642824347],
                [0.0454545455, 22, 500, 0.0454545455]
            ],[
                [12.9090909091, 0.0774647887, 3, 0.7660136157],
                [12.9090909091, 0.0774647887, 4, 0.7660136157],
                [5.8181818182, 0.171875, 5, 0.5142594772],
                [3.7727272727, 0.265060241, 10, 0.4141106172],
                [2.2727272727, 0.44, 20, 0.3214121733],
                [0.8181818182, 1.2222222222, 50, 0.192847304],
                [0.1818181818, 5.5, 100, 0.0909090909],
                [0.0454545455, 22, 200, 0.0454545455]
            ],[
                [8.4545454545, 0.1182795699, 3, 0.6199173499],
                [8.4545454545, 0.1182795699, 4, 0.6199173499],
                [4.0454545455, 0.2471910112, 5, 0.4288173242],
                [2.7272727273, 0.3666666667, 10, 0.3520893951],
                [1.7272727273, 0.5789473684, 20, 0.2802006365],
                [0.7272727273, 1.375, 50, 0.1818181818],
                [0.4545454545, 2.2, 100, 0.1437398936],
                [0.1363636364, 7.3333333333, 200, 0.0787295822],
                [0.0454545455, 22, 500, 0.0454545455],
                [0.0454545455, 22, 1000, 0.0454545455],
                [0.0454545455, 22, 2000, 0.0454545455]
            ],[
                [22.8636363636, 0.0437375746, 3, 1.0194391587],
                [22.8636363636, 0.0437375746, 4, 1.0194391587],
                [10.9545454545, 0.0912863071, 5, 0.7056443044],
                [7.3181818182, 0.1366459627, 10, 0.5767535246],
                [4.6818181818, 0.213592233, 20, 0.461313253],
                [1.9090909091, 0.5238095238, 50, 0.2945791227],
                [0.8181818182, 1.2222222222, 100, 0.192847304],
                [0.2727272727, 3.6666666667, 200, 0.1113404429],
                [0.0909090909, 11, 500, 0.0642824347],
                [0.0454545455, 22, 1000, 0.0454545455],
                [0.0454545455, 22, 2000, 0.0454545455],
            ]
           ];

    dataPath.forEach(function(datai, i){
        datai.forEach(function(dataj, j){
            dataPath[i][j] = {y: dataj[0], x: dataj[2], e: dataj[3]};
        });
    });

    let labels = ["Tectonic", "Landslides", "Hydrometeorological", "TOTAL"];
    new DrawBarChart().init().drawPath("#viewport-graph", dataPath, labels, true);
};

var loadRiskModelaad = function(data){
    let aadModel = {};
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

        if (aadModel.hasOwnProperty(d.iso3)){
            if (aadModel[d.iso3].hasOwnProperty(d.analysis_type)){
                aadModel[d.iso3][d.analysis_type][d.hazard] = parseFloat(d.aad);
            }else{
                aadModel[d.iso3][d.analysis_type] = {};
                aadModel[d.iso3][d.analysis_type][d.hazard] = parseFloat(d.aad);
            }
        }else{
            aadModel[d.iso3] = {};
            aadModel[d.iso3][d.analysis_type] = {};
            aadModel[d.iso3][d.analysis_type][d.hazard] = parseFloat(d.aad);
        }
    });

    filters.reload();
    return aadModel;

};

var drawAadBar = function(aadModel, hazards, typeList, countries){
    let arrayDataBar = [];
    if( aadModel == undefined ) {
        console.log('Error: Load Risk aad Data is not loaded yet');
        return false;
    };
    for(let k in aadModel){
        if(countries.length > 1 && countries.indexOf(k) == -1){continue;};
        let newData = aadModel[k];
        newData.x = k;
        arrayDataBar.push(newData);
    }
    new DrawBarChart().init().drawBar("#viewport-chart", arrayDataBar, hazards, typeList);
};

var loadAndDrawBarChart = function(countries, hazards, typeList){
    $(document).ready(function() {
        $.ajax({
            type: "GET",
            url: "static/data/risk_model_aad.csv",
            dataType: "text",
            success: function(data) {
                drawAadBar(loadRiskModelaad(data), hazards, typeList, countries);
            }
         });
    });
};
$(document).ready(function(){
    let countries =
        ["BDI", "BEN", "BFA", "BWA",
        "CAF", "CIV", "CMR", "COD",
        "COG", "COM", "CPV", "DJI",
        "DZA", "EGY", "ERI", "ESH",
        "ETH", "GAB", "GHA", "GIN",
        "GMB", "GNB", "GNQ", "KEN",
        "LBR", "LBY", "LSO", "MAR",
        "MDG", "MLI", "MOZ", "MRT",
            "MUS", "MWI", "ARG"],
        hazards = [ 'Total', 'Wind', 'Flood', 'Storm',
                    'Tsunami', 'Tectonic', 'Volcanic',
                    'Landslides', 'Earthquake', 'Hydrometeorological'],
    typeList = ['Prospective', 'Retrospective', 'Hybrid'];
    draw();
    loadAndDrawBarChart(countries, hazards, typeList);

    $('#apply-filter-btn').click(function(){
        // console.log(filters.getSelectedTypeList());
        // console.log(filters.getSelectedHazards());
    });
});
