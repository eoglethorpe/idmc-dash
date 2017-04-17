let map;
let countriesGeoData;
let countriesMapLayer;
let aadDataModel = {};
let riskDataModel = {};
let aadCountries = {};
let riskCountries = {};
let iso3ToShortNameModel = {};
let selectableCountries = [];

function styleMapFeature(feature) {
    let selected = $('.countries-select').val().indexOf(feature.properties.ISO3) >= 0;
    let selectable = (selectableCountries.indexOf(feature.properties.ISO3) >= 0);

    return {
        fillColor: (selected ? 'rgba(52,152,219,0.7)' : (selectable ? 'rgba(189,195,199,0.6)' : '#fff')),
        weight: 1.4,
        opacity: 1,
        color: '#37373b',
        dashArray: '3',
        fillOpacity: 1,
    };
}

function onEachMapFeature(feature, layer) {
    if(selectableCountries.indexOf(feature.properties.ISO3) >= 0){
        $('.countries-select')[0].selectize.addOption({
            value: feature.properties.ISO3,
            text: feature.properties.English,
        });
    }

    iso3ToShortNameModel[feature.properties.ISO3] = feature.properties.Short_Name;

    layer.on('click', function() {
        let selection = $('.countries-select').val();
        let item = feature.properties.ISO3;

        let index = selection.indexOf(item);
        if (index < 0) {
            selection.push(item);
        } else {
            selection.splice(index, 1);
        }

        $('.countries-select')[0].selectize.setValue(selection);
    });
}

function refreshMap() {
    if (!map) {
        return;
    }

    if (countriesMapLayer) {
        countriesMapLayer.clearLayers();
    }

    countriesMapLayer = L.geoJson(countriesGeoData, {
        style: styleMapFeature,
        onEachFeature: onEachMapFeature,
    }).addTo(map);
}

let filters = {
    init: function() {
        let that = this;
        this.reset();
        this.reload();

        $('.filter').change(function() {
            that.refreshRegionSelections();
        });
    },

    reset: function() {
        this.hazardTypes = {
            prospective: [],
            retrospective: [],
            hybrid: [],
        };
    },

    clear: function() {
        $('#prospective-data-type .hazard-type')[0].selectize.setValue([]);
        $('#retrospective-data-type .hazard-type')[0].selectize.setValue([]);
        $('#country-select-wrapper .countries-select')[0].selectize.setValue([]);
        $('#geo-region-select-wrapper .geo-region-select')[0].selectize.setValue([]);
        $('#income-group-select-wrapper .income-group-select')[0].selectize.setValue([]);

        $('#prospective-check').prop('checked', false);
        $('#retrospective-check').prop('checked', false);
        $('#hybrid-check').prop('checked', false);
        this.refreshRegionSelections();
        refreshMap();
    },

    addHazardType: function(analysisType, hazardType) {
        if (analysisType) {
            if (filters.hazardTypes[analysisType].indexOf(hazardType) < 0) {
                filters.hazardTypes[analysisType].push(hazardType);
            }
        }
    },

    reload: function() {
        let prospective = $('#prospective-data-type .hazard-type')[0].selectize;
        prospective.clearOptions();
        this.hazardTypes.prospective.forEach(function(type) {
            prospective.addOption({ value: type, text: type });
        });


        let retrospective = $('#retrospective-data-type .hazard-type')[0].selectize;
        retrospective.clearOptions();
        this.hazardTypes.retrospective.forEach(function(type) {
            retrospective.addOption({ value: type, text: type });
        });

        this.refreshRegionSelections();
    },

    refreshRegionSelections: function() {
        selectableCountries = [];
        let selectedCountries = $('.countries-select').val();

        if($('#prospective-check').is(':checked')){
            let prospectiveTypes = $('#prospective-data-type .hazard-type').val();
            for (let i=0; i<prospectiveTypes.length; i++) {
                let type = prospectiveTypes[i];
                let countries = riskCountries['prospective'][type];

                for (let j=0; j<countries.length; j++) {
                    if (selectableCountries.indexOf(countries[j]) < 0) {
                        selectableCountries.push(countries[j]);
                    }
                }
            }
        }
        if($('#retrospective-check').is(':checked')){
            let retrospectiveTypes = $('#retrospective-data-type .hazard-type').val();
            for (let i=0; i<retrospectiveTypes.length; i++) {
                let type = retrospectiveTypes[i];
                let countries = riskCountries['retrospective'][type];

                for (let j=0; j<countries.length; j++) {
                    if (selectableCountries.indexOf(countries[j]) < 0) {
                        selectableCountries.push(countries[j]);
                    }
                }
            }
        }
        if($('#hybrid-check').is(':checked')){
            let countries = riskCountries['hybrid']['total'];

            for (let j=0; j<countries.length; j++) {
                if (selectableCountries.indexOf(countries[j]) < 0) {
                    selectableCountries.push(countries[j]);
                }
            }
        }

        $('.countries-select')[0].selectize.clearOptions();
        $('.countries-select')[0].selectize.setValue(selectedCountries);
        refreshMap();
    },

    getSelectedHazards: function() {
        return {
            prospective: $('#prospective-data-type .hazard-type').val(),
            retrospective: $('#retrospective-data-type .hazard-type').val(),
            hybrid: ['total'],
        }
    },

    getSelectedTypeList: function() {
        let typeList = [];
        if($('#prospective-check').is(':checked')){
            typeList.push('prospective');
        }
        if($('#retrospective-check').is(':checked')){
            typeList.push('retrospective');
        }
        if($('#hybrid-check').is(':checked')){
            typeList.push('hybrid');
        }
        return typeList;
    },

    getSelectedCountry: function() {
        return $('#country-select-wrapper .countries-select').val();
    },
};

$(document).ready(function(){

    $('.hazard-type').selectize({plugins: ["remove_button"]});
    $('.countries-select').selectize({plugins: ["remove_button"]});
    $('.geo-region-select').selectize({plugins: ["remove_button"]});
    $('.income-group-select').selectize({plugins: ["remove_button"]});
    filters.init();

    $('.countries-select').on('change', function() {
        refreshMap();
    });
    $('.select-all-hazard').click(function(){
        let selectField = $(this).siblings('.hazard-type')[0];

        if($(this).hasClass('double-check')){
            $(this).removeClass('double-check').addClass('remove').attr('src', 'static/imgs/remove.png');
            selectField.selectize.setValue(Object.keys(selectField.selectize.options));
        }
        else if($(this).hasClass('remove')){
            $(this).removeClass('remove').addClass('double-check').attr('src', 'static/imgs/double_check.png');
            selectField.selectize.setValue([]);
        }
    });

    $('.hazard-type').on('change', function(){
        if(($(this).closest('#prospective-data-type').length > 0)){
            $('#prospective-check').prop('checked', true);
            if($(this).val().length < 1){
                $('#prospective-check').prop('checked', false);
            }
        }
        else if(($(this).closest('#retrospective-data-type').length > 0)){
            $('#retrospective-check').prop('checked', true);
            if($(this).val().length < 1){
                $('#retrospective-check').prop('checked', false);
            }
        }
        filters.refreshRegionSelections();
    });
    // Show the map
    map = L.map('the-map').setView([41.87, 12.6], 1);
    map.scrollWheelZoom.disable();

    // Toggle scroll-zoom by clicking on and outside map
    map.on('focus', function() { map.scrollWheelZoom.enable(); });
    map.on('blur', function() { map.scrollWheelZoom.disable(); });

    // Load countries geojson in the map
    $.getJSON('static/countires.geojson', function(data) {
        countriesGeoData = data;
        refreshMap();
    });
});
