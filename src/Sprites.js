"use strict";

function readChunks(content, offset, w, h) {
    let result = [];

    while(result.length < w * h ) {
        let chunk = [];
        let isDone = false;

        while(!isDone) {
            let chunkSize = content.readInt8(offset++);
            if (chunkSize > 0) {
                for (let i = 0; i < chunkSize; i++) {
                    chunk.push(content.readUInt8(offset++));
                }
            } else if (chunkSize < 0) {
                for (let i = 0; i < -chunkSize; i++) {
                    chunk.push(-1);
                }
            } else {
                for (let i = chunk.length; i < w; i++) {
                    chunk.push(-1);
                }
                isDone = true;
            }
        }

        result = result.concat(chunk);
    }

    return result;
}

function readExtendedChunks(content, offset, w, h) {
    let result = [];

    while(result.length < w * h ) {
        let chunk = [];
        let isDone = false;

        while(!isDone) {
            let chunkSize = content.readUInt8(offset);
            offset++;

            if (chunkSize >= 1 && chunkSize <= 63) {
                for (let i = 0; i < chunkSize; i++) {
                   chunk.push(content.readUInt8(offset++));
                }
            } else if (chunkSize >= 64 && chunkSize <= 127) {
                let b = content.readUInt8(offset++);
                for (let i = 0; i < chunkSize - 60; i++) {
                   chunk.push(b);
                }
            } else if (chunkSize >= 128 && chunkSize <= 191) {
                for (let i = 0; i < chunkSize - 128; i++) {
                   chunk.push(-1);
                }
            } else if (chunkSize >= 192 && chunkSize <= 254) {
                let b = content.readUInt8(offset++);
                for (let i = 0; i < chunkSize - 124; i++) {
                   chunk.push(b);
                }
            } else if (chunkSize === 255) {
                let count = content.readUInt8(offset++);
                let b = content.readUInt8(offset++);
                for (let i = 0; i < count; i++) {
                   chunk.push(b);
                }
            } else {
                for (let i = chunk.length; i < w; i++) {
                    chunk.push(-1);
                }
                isDone = true;
            }
        }
        result = result.concat(chunk);
    }

    return result;
}

class Sprite {
    constructor(name, index, content, offset, width, height, type, palette) {
        this.width = width;
        this.height = height;
        this.palette = palette;
        this.name = name;
        this.index = index;

        switch (type) {
            case "chunks":
                this.imgRaw = readChunks(content, offset, this.width, this.height);
                break;
            case "extendedchunks":
                this.imgRaw = readExtendedChunks(content, offset, this.width, this.height);
                break;
        }
    }

    toString() {
        return `${this.name}_${this.index}`;
    }

    toBuffer() {
        let pixels = [];

        for (let pixel of this.imgRaw) {
            if (pixel === -1) {
                pixels.push(0, 0, 0, 0);
            } else {
                var color = this.palette.get(pixel);
                pixels.push(color.r, color.g, color.b, 255);
            }
        }

        return new Buffer(pixels);
    }
}

module.exports = class Sprites {
    constructor(name, content, data, type, palette) {
        this.byIndex = [];
        this.byOffset = {};

        for (let offset = 0; offset < content.length; offset += 6) {
            let spriteDef = {
                offset: content.readUInt32LE(offset),
                width: content.readUInt8(offset + 4),
                height: content.readUInt8(offset + 5)
            };

            let sprite = new Sprite(name, this.byIndex.length, data, spriteDef.offset, spriteDef.width, spriteDef.height, type, palette);
            this.byIndex.push(sprite);
            this.byOffset[offset] = sprite;
        }
    }

    getByIndex(index) {
        return this.byIndex[index];
    }

    getByOffset(offset) {
        return this.byOffset[offset];
    }

    [Symbol.iterator]() {
        return this.byIndex[Symbol.iterator]();
    }
};
