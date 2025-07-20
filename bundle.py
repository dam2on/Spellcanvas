from subprocess import call, run, PIPE
import shutil
import os

def prepareDirs():
    dirs = ["output", "output/css", "output/img"]
    for d in dirs:
        if not os.path.exists(d):
            os.mkdir(d)

def moveFiles():
    files = ["favicon.ico",
    "error.html",
    "css/error.css",
    "peererror.html",
    "img/bg.jpg",
    "img/size-desc.png",
    "img/dead.png",
    "img/grid-help.gif",
    "img/error.gif",
    "img/sitemodes.jpg",
    "img/orc.png"]
    for f in files:
        shutil.copyfile(f, os.path.join('output', f))

    # Modify script & css links to use minified versions
    with open("index.html", "r") as htmlIn:
        lines = htmlIn.readlines()
    with open("output/index.pre-min.html", "w+") as htmlOut:
        for line in lines:
            if line.strip().startswith('<script'):
                if line.find('src="helpers/') >= 0:
                    continue
                elif line.find('src="classes/') >= 0:
                    continue
                elif line.find('src="main.js"') >= 0:
                    htmlOut.write('<script type="text/javascript" src="main.min.js"></script>\n')
                else:
                    htmlOut.write(line)
            elif line.strip().startswith('<link'):
                if (line.find('href="css/') >= 0):
                    if (line.find('href="css/styles.css"') >= 0):
                        htmlOut.write('<link rel="stylesheet" href="css/styles.min.css"></link>\n')
                else:
                    htmlOut.write(line)
            else:
                htmlOut.write(line)

def runCmds():
    cmds = [
    "npx terser -c ecma=2016 -m --manglge-props --source-map -o output/main.min.js helpers/utils.js helpers/enums.js helpers/tour.js helpers/peerjs-options.js classes/* main.js",
    "npx uglifycss --debug --output output/css/styles.min.css css/loader.css css/styles.css"]
    for c in cmds:
        run(c.split(), stdin=PIPE, stdout=PIPE, stderr=PIPE, shell=True)
    
    htmlMinifyCmd = "npx html-minifier-terser output/index.pre-min.html --collapse-boolean-attributes --collapse-whitespace --decode-entities --minify-css --minify-js --process-conditional-comments --remove-attribute-quotes --remove-comments --remove-empty-attributes --remove-optional-tags --remove-redundant-attributes --remove-script-type-attributes --sort-attributes --sort-class-name --trim-custom-fragments --use-short-doctype"
    htmlFile = open("output/index.html", "w+")
    call(htmlMinifyCmd.split(), stdout=htmlFile, shell=True)
    os.remove('output/index.pre-min.html')

prepareDirs()
moveFiles()
runCmds()