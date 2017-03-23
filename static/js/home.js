let selectedCountries = [
    'NPL', 'IND', 'AUS', 'MNG', 'CAN'
];
let map;
let countriesGeoData;
let countriesMapLayer;

function styleMapFeature(feature) {
    let selected = $('.countries-select').val().indexOf(feature.properties.iso_a3) >= 0;
    return {
        fillColor: selected ? '#073861' : '#ecf0f1',
        weight: 1.4,
        opacity: 1,
        color: '#37373b',
        dashArray: '3',
        fillOpacity: 0.6
    };
}

function onEachMapFeature(feature, layer) {
    $('.countries-select')[0].selectize.addOption({
        value: feature.properties.iso_a3,
        text: feature.properties.name,
    });
}

function refreshMap() {
    if (countriesMapLayer) {
        countriesMapLayer.clearLayers();
    }

    countriesMapLayer = L.geoJson(countriesGeoData, {
        style: styleMapFeature,
        onEachFeature: onEachMapFeature,
    }).addTo(map);
}

$(document).ready(function(){

    $('.hazard-type').selectize();
    $('.countries-select').selectize();
    $('.geo-region-select').selectize();
    $('.income-group-select').selectize();

    $('.countries-select').on('change', function() {
        refreshMap();
    });

    // Show the map
    map = L.map('the-map').setView([41.87, 12.6], 1);
    map.scrollWheelZoom.disable();

    // Toggle scroll-zoom by clicking on and outside map
    map.on('focus', function() { map.scrollWheelZoom.enable(); });
    map.on('blur', function() { map.scrollWheelZoom.disable(); });

    // Load countries geojson in the map
    $.getJSON('static/countries.geo.json', function(data) {
        countriesGeoData = data;
        refreshMap();
    });
});
