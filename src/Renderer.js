"use strict";

var fs = require("fs-extra");
var PNG = require("pngjs").PNG;
var GIFEncoder = require('gif-encoder');
var debug = require('debug')('debug');
var info = require('debug')('info');

var xy2offset = (x, y, w) => (x + (y * w)) * 4;
var offset2xy = (offset, w) => ({
    x: (offset / 4) % w,
    y: Math.floor((offset / 4) / w)
});


module.exports = class Renderer {

    static renderSprite(sprite, outputPath){
        info(`Rendering sprite: ${sprite}`);
        debug(`   Output: ${outputPath}`);
        debug(`   Size: ${sprite.width} x ${sprite.height}`);

        return new Promise((resolve, reject) => {
            let png = new PNG({width: sprite.width, height: sprite.height});
            let out = fs.createWriteStream(outputPath);
            let buffer = sprite.toBuffer();

            for (var offset = 0; offset < buffer.length; offset++) {
                png.data[offset] = buffer.readUInt8(offset);
            }

            png.pack()
                .on("end", resolve)
                .on("error", reject)
                .pipe(out);
        });
    }

    static renderAnimation(animation, outputPath, classes) {
        info(`Rendering animation: ${animation}`);
        debug(`   Output: ${outputPath}`);
        debug(`   Size: ${animation.width} x ${animation.height}`);
        debug(`   Frames: ${animation.getNumberFrames()}`);

        return new Promise((resolve, reject) => {
            if (animation.width === 0) return reject("Can't render animation with 0 width");
            if (animation.height === 0) return reject("Can't render animation with 0 height");

            let gif = new GIFEncoder(animation.width, animation.height);
            let out = fs.createWriteStream(outputPath);
            gif.on("end", resolve)
                .on("error", reject)
                .pipe(out);

            gif.setRepeat(0);
            gif.setQuality(1);
            gif.setDelay(1000 / 12);
            gif.setTransparent(0xFF00FF);
            gif.writeHeader();

            let initialFrame = []
            for (var i = 0; i < animation.width * animation.height; i++) {
                initialFrame.push(255, 0, 255, 0);
            }

            for(let frame of animation) {
                gif.addFrame(module.exports.renderAnimationFrame(frame, animation.offsetX, animation.offsetY, animation.width, classes, initialFrame.concat([])));
                gif.flushData();
            }
            gif.finish();
        });
    }

    static renderAnimationFrame(frame, offsetX, offsetY, width, classes, initialFrame) {
        let result = initialFrame;

        let elements = frame.list.filter(f => {
            return f.layerId === 0 || f.layerId === 1 || classes[f.layerClass] === f.layerId
        })

        for (let i = 0; i < elements.length; i++) {
            let element = elements[i];
            let spriteBuffer = element.sprite.toBuffer();
            let spriteWidth = element.sprite.width;
            let spriteHeight = element.sprite.height;
            let ox = element.offsetX - offsetX;
            let oy = element.offsetY - offsetY;
            let flipVertical = element.flipVertical;
            let flipHorizontal = element.flipHorizontal;

            for (let offset = 0; offset < spriteBuffer.length; offset += 4) {
                let a = spriteBuffer.readUInt8(offset + 3);
                if (a === 0) continue;

                let coord = offset2xy(offset, spriteWidth);
                let newX = flipVertical ? (spriteWidth - 1 - coord.x) : coord.x;
                let newY = flipHorizontal ? (spriteHeight - 1 - coord.y) : coord.y;

                let newOffset = xy2offset(newX + ox, newY + oy, width);
                result[newOffset] = spriteBuffer.readUInt8(offset);
                result[newOffset + 1] = spriteBuffer.readUInt8(offset + 1);
                result[newOffset + 2] = spriteBuffer.readUInt8(offset + 2);
                result[newOffset + 3] = 255;
            }
        }
        return result;
    }
};
