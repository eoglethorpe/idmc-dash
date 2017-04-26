# IDMC-DASH
---

### For Integration

Page folder structure:

```
.
├── index.html # contains html tags
├── README.md
├── scss_watch.py # convert scss to css
├── static
│   ├── countires.geojson # country map data
│   ├── css # don't edit this files
│   │   ├── main.css
│   │   ├── main.css.map
│   │   ├── selectize.css
│   │   └── selectize.css.map
│   ├── data # contains data files
│   │   ├── aad.csv
│   │   ├── aad_geo_groups.csv
│   │   ├── aad_income_groups.csv
│   │   ├── hybrid_dec.csv
│   │   ├── prospective_dec.csv
│   │   └── retrospective_dec.csv
│   ├── imgs
│   │   ├── double_check.png
│   │   ├── logo.png
│   │   └── remove.png
│   └── js
│       ├── d3.js # draw charts
│       ├── drawChart.js # loads data
│       ├── home.js
│       └── selectize.min.js
└── stylesheets # edit style here
    ├── main.scss
    └── selectize.scss
```

##### For Integration:
> - `index.html` contains html.
> - `static/` folder contains css, js, image and data files.
> - `scss_watch.py` converts scss into css. (run once after scss files are changed)
> - Change location in index.html if structure is different(for css, data, imgs and js).

##### For style update in future:
> - Don't edit files in .css files. Instead edit .scss files.
> - Use scss_watch.py to convert scss into css(Requires python3)
```bash
./scss_watch.py # This converts scss into css
```

#### For Data update in future:
> - `static/js/drawChart.js` file handles data loading.
> - Files in directory `static/data/` contains data.
> - Replace those files with new ones.
> - Use new names for those files,
    and update file location in `drawChart.js` to avoid cache issues.

---

### For testing locally
> Start Server with python as(or apache):

```bash
python3 -m http.server 8070 # python2 -m SimpleHTTPServer 8070
```

> View in browser [localhost:8070](http://localhost:8070/)
