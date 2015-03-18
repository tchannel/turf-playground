angular.module('turf-playground').service('geometriesService', function ($rootScope, $map, $mapFeatures) {
    var self = this;

    $scope = $rootScope.$new()
    // Format that's easier for the frontend
    $scope.geometries = [];
    // Our authoritative list of geometries. It's watched,
    // so if anything is added in any way (editor or draw tools),
    // it gets updated properly. This allows async within the editor
    // to modify geometries
    $scope.geojsons = {};
    $scope.geom_id = 0;

    $scope.watching_geojsons = true;

    $scope.$watch("geojsons", function (geojsons, old) {
        if ($scope.watching_geojsons) {
            $scope.watching_geojsons = false;
            // TODO: Only clear the layers that changed?
            // this could get really slow, if we're testing out
            // heavy stuff
            $mapFeatures.clearLayers();
            $scope.geometries = [];
            _.each(geojsons, function (val, key) {
                try {
                    var geom = addToMap(val, key);
                } catch (e) {
                    // TODO: error console / popup
                    console.log(e)
                }
            });
            $scope.watching_geojsons = true;
            $map.fitBounds($mapFeatures)
        }
    }, true);

    // Builds dictionary of geojson geometries, which will be
    // accessible in the editor environment
    var addGeometry = function(layer, name) {
        if (!name) {
            $scope.geom_id++;
            name = "feature"+$scope.geom_id
        }
        var geojson = layer.toGeoJSON();
        $scope.geojsons[name] = geojson;
        $scope.geometries.push({
            name: name,
            new_name: name,
            geojson: geojson,
            geom: layer
        });
    };

    var addToMap = function (json, name) {
        var geom = L.geoJson(json, {
            onEachFeature: function (feature, layer) {

                table = "<h4>Properties</h4>"
                    + "<table class='pure-table'>"
                    + "<thead><tr><th>Key</th><th>Value</th></tr></thead>"
                    + "<tbody";
                _.each(feature.properties, function (val, key) {
                    if (key.name != "style") {
                        table += "<tr><td>"+key+"</td><td>"+val+"</td></tr>";
                    }
                });
                table += "</tbody>"
                    +"</table>";
                layer.bindPopup(table);
            },
            style: function(feature) {
                if (feature.properties.style) {
                    return feature.properties.style
                }
                return {};
            }
        });

        var idx = 0;
        geom.eachLayer(function(elem) {
            if(idx == 0) {
                addGeometry(elem, name);
            } else {
                addGeometry(elem);
            }
            $mapFeatures.addLayer(elem);
            idx++;
        });
    };

    // When a shape is created using L.Draw, add it to our internal geometries list
    $map.on('draw:created', function(e) {
        addGeometry(e.layer)
        $scope.$apply();
    });

    $map.on('draw:edited', function (e) {
        var layers = e.layers;
        layers.eachLayer(function (layer) {
            var geoms = _.where($scope.geometries, {geom: layer});
            _.each(geoms, function (elem) {
                $scope.geojsons[elem.name] = layer.toGeoJSON();
            });
        });
    });

    $map.on('draw:deleted', function (e) {
        var layers = e.layers;
        layers.eachLayer(function (layer) {
            var geoms = _.where($scope.geometries, {geom: layer})

            _.each(geoms, function (elem) {
                self.deleteGeometry(elem);
            });
        });
        $scope.$apply();
    });

    this.updateGeometryName = function (geom) {
        $scope.watching_geojsons = false;
        delete $scope.geojsons[geom.name];
        $scope.watching_geojsons = true;
        $scope.geojsons[geom.new_name] = geom.geojson;
    };

    this.deleteGeometry = function(geom) {
        delete $scope.geojsons[geom.name];
        $mapFeatures.removeLayer(geom.geom);
    };

    this.emptyDraw = function () {
        $scope.geojsons = {};
    };
    this.getGeometries = function () {
        return $scope.geometries;
    };
    this.getGeojsons = function () {
        return $scope.geojsons;
    };
});