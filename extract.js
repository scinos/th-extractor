"use strict";

let fs = require("fs-extra");
let path = require("path");

let Palette = require("./src/Palette.js");
let Sprites = require("./src/Sprites.js");
let Animations = require("./src/Animations.js");
let Renderer = require("./src/Renderer.js");
let config = require("./config.js");

let basePath = config.basePath;
let palettes = {};
let sprites = {};
let animations = {};
let paletteFiles = config.palettes;
let graphicFiles = config.graphics;
let animationFiles = config.animations;

function runPromisesInSeries(promiseFactories) {
    return promiseFactories.reduce((result, promiseFactory) => {
        return result
            .then(promiseFactory)
            .catch(function(e) {
                console.log(e.stack || e);
            });
    }, Promise.resolve());
}

Object.keys(paletteFiles).forEach(name => {
    let file = paletteFiles[name];
    let content = fs.readFileSync(path.join(basePath, file));
    palettes[name] = new Palette(name, content);
});

Object.keys(graphicFiles).forEach(name => {
    let graphicDef = graphicFiles[name];
    let paletteName = graphicDef.palette;
    let type = graphicDef.type;
    let dataFile = graphicDef.data;
    let indexFile = graphicDef.index;
    let palette = palettes[paletteName];

    let indexContent = fs.readFileSync(path.join(basePath, indexFile));
    let dataContent = fs.readFileSync(path.join(basePath, dataFile));

    sprites[name] = new Sprites(name, indexContent, dataContent, type, palette);
});

Object.keys(animationFiles).forEach(name => {
    let animationDef = animationFiles[name];

    let frames = fs.readFileSync(path.join(basePath, animationDef.frames));
    let lists = fs.readFileSync(path.join(basePath, animationDef.lists));
    let elements = fs.readFileSync(path.join(basePath, animationDef.elements));
    let sprite = sprites[animationDef.sprites];
    animations[name] = new Animations(name, frames, lists, elements, sprite);

    return Promise.resolve();
});

Promise.resolve()
    .then(() => {
        let palettesPath = path.join("out/palettes");
        fs.ensureDirSync(palettesPath);
        return runPromisesInSeries(Object.keys(palettes).map(name => () => {
            let filePath = path.join(palettesPath, name + ".png");
            let palette = palettes[name];
            return Renderer.renderSprite(palette, filePath);
        }));
    })
    .then(() => {
        let spritesPath = path.join("out/sprites");
        fs.ensureDirSync(spritesPath);
        return runPromisesInSeries(Object.keys(sprites).map(name => () => {
            let spritePath = path.join(spritesPath, name);
            fs.ensureDirSync(spritePath);

            return runPromisesInSeries(Array.from(sprites[name]).map((sprite, index) => () => {
                let filePath = path.join(spritePath, name + "_" + index + ".png");
                return Renderer.renderSprite(sprite, filePath);
            }));
        }));
    })
    .then(() => {
        let animationsPath = path.join("out/animations");
        fs.ensureDirSync(animationsPath);
        return runPromisesInSeries(Object.keys(animations).map(name => () => {
            let animationCollection = animations[name];
            let animationPath = path.join(animationsPath, name);
            fs.ensureDirSync(animationPath);

            return runPromisesInSeries(Array.from(animationCollection).map((animation, index) => () => {
                let filePath = path.join(animationPath, name + "_" + index + ".gif");
                return Renderer.renderAnimation(animation, filePath);
            }));
        }));
    })
