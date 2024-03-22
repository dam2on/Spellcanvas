mkdir -p output
cd output
mkdir -p img
mkdir -p css
cd ..
terser -c ecma=2016 -m --manglge-props --source-map -o output/main.min.js helpers/* classes/* main.js
uglifycss --debug --output output/css/styles.min.css css/loader.css css/styles.css
cp favicon.ico output
cp index.html output
cp error.html output
cp css/error.css output/css
cp peererror.html output
cp img/bg.jpg output/img
cp img/size-desc.png output/img
cp img/dead.png output/img
cp img/grid-help.gif output/img
cp img/error.gif output/img
cp img/sitemodes.jpg output/img
cp img/orc.png output/img