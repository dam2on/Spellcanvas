mkdir -p output
cd output
mkdir -p img
mkdir -p css
cd ..
terser -c ecma=2016 -m --manglge-props --source-map -o output/main.min.js helpers/* classes/* main.js
uglifycss --debug --output output/css/styles.min.css css/*
cp favicon.ico output
cp index.html output
cp error.html output
cp img/bg.jpg output/img
cp img/dead.png output/img
cp img/grid-help.gif output/img
cp img/orc.png output/img