mkdir output
cd output
mkdir img
terser -c ecma=2016 -m --manglge-props --source-map -o main.min.js ../helpers/* ../classes/* ../main.js
cd ..
cp index.html output
cp img/bg.jpg output/img
cp img/dead.png output/img
cp img/grid-gif.gif output/img
cp img/orc.png output/img