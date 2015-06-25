"use strict";

module.exports = class Palette {
    constructor(name, content) {
        this.name = name;
        this.width = 16;
        this.height = 16;

        this.palette = [];
        for (var offset = 0; offset < content.length; offset += 3) {
            this.palette.push({
                r: content.readUInt8(offset, false) * 4,
                g: content.readUInt8(offset + 1, false) * 4,
                b: content.readUInt8(offset + 2, false) * 4
            });
        }
    }

    get(index) {
        return this.palette[index];
    }

    toString() {
        return this.name;
    }

    toBuffer() {
        let pixels = [];

        for (let pixel = 0, i = 0; pixel < this.width * this.height; pixel++) {
            var color = this.get(pixel);
            pixels[i++] = color.r;
            pixels[i++] = color.g;
            pixels[i++] = color.b;
            pixels[i++] = 255;
        }

        return new Buffer(pixels);
    }
};
