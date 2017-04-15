"use strict";


function createSets(num) {
    const out=[];
    for (var i = 0; i<13; i++) {
        out[i] = new Set([0]);
    }
    return out;
}


function combine(classes, acc=[], result=[]) {
    if (!Array.isArray(classes[0])) {
        acc.push(result);
    } else if (classes[0].length === 0) {
        let partialResult = [].concat(result).concat(undefined);
        combine(classes.slice(1), acc, partialResult);
    } else {
        for (var i = 0; i<classes[0].length; i++){
            let partialResult = [].concat(result).concat([classes[0][i]]);
            combine(classes.slice(1), acc, partialResult);
        }
    }
    return acc;
}


class Frame{
    constructor(list, width, height, soundIndex, flags, nextIndex) {
        this.list = list;
        this.width = width;
        this.height = height;
        this.soundIndex = soundIndex;
        this.nextIndex = nextIndex;
        this.isStart = !!(flags && 0x1);
    }

    [Symbol.iterator]() {
        return this.list[Symbol.iterator]();
    }
}

class Element{
    constructor(sprite, offsetX, offsetY, layerClassAndFlags, layerId) {
        this.sprite = sprite;
        this.offsetX = offsetX;
        this.offsetY = offsetY;

        this.flags = layerClassAndFlags & 0xF;
        this.layerClass = layerClassAndFlags >> 4;
        this.layerId = layerId;

        this.flipVertical = this.flags & 0x1;
        this.flipHorizontal = this.flags & 0x2;
        this.alpha50 = this.flags & 0x4;
        this.alpha75 = this.flags & 0x8;
    }
}

class Animation{
    constructor(name, index) {
        this.frames = [];
        this.name = name;
        this.index = index;
    }

    addFrame(frame) {
        if (frame.isStart) {
            this.initialFrame = frame;
        }
        this.frames.push(frame);
    }

    getNumberFrames() {
        return this.frames.length;
    }

    computeViewport() {
        let x = Infinity;
        let y = Infinity;
        let x2 = 0;
        let y2 = 0;

        for(let frame of this.frames) {
            for (let element of frame) {
                x = Math.min(x, element.offsetX);
                y = Math.min(y, element.offsetY);
                x2 = Math.max(x2, element.offsetX + element.sprite.width);
                y2 = Math.max(y2, element.offsetY + element.sprite.height);
            }
        }

        this.offsetX = x;
        this.offsetY = y;
        this.width = x2 - x;
        this.height = y2 - y;
    }

    [Symbol.iterator]() {
        return this.frames[Symbol.iterator]();
    }

    toString() {
        return `${this.name}_${this.index}`;
    }

    getClasses() {
        let classes=createSets(13);

        for(let frame of this.frames) {
            for(let {layerId, layerClass} of frame.list) {
                if (layerId === 0 || layerId === 1) continue;
                classes[layerClass].add(layerId);
            }
        }

        classes = classes.map(ids => Array.from(ids).sort((a,b)=> a-b))
        return combine(classes);
    }
}


function extractAnimations(name, frames) {
    let animations = [];

    for (let frame of frames) {
        if (frame.isStart) {
            let animation = new Animation(name, animations.length);
            animations.push(animation);

            var nextFrame = frame;
            do{
                animation.addFrame(nextFrame);
                nextFrame = frames[nextFrame.nextIndex];
            }while(nextFrame && !nextFrame.isStart);
            animation.computeViewport();
        }
    }

    return animations;
}

function extractFrames(content, lists) {
    let frames = [];

    for (let offset = 0; offset < content.length; offset += 10) {
        frames.push(new Frame(
            lists[content.readUInt32LE(offset)],
            content.readUInt8(offset + 4),
            content.readUInt8(offset + 5),
            content.readUInt8(offset + 6),
            content.readUInt8(offset + 7),
            content.readUInt16LE(offset + 8)
        ));
    }


    return frames;
}

function extractLists(content, elements) {
    let lists = [];
    let currentList = [];
    let absoluteIndex = 0;
    let targetIndex = 0;

    for (let offset = 0; offset < content.length; offset += 2) {
        let index = content.readUInt16LE(offset);
        if (index !== 0xFFFF) {
            currentList.push(elements[index]);
        } else {
            lists[targetIndex] = currentList;
            targetIndex = absoluteIndex + 1;
            currentList = [];
        }
        absoluteIndex++;
    }

    return lists;
}

function extractElements(content, sprites) {
    let elements = [];

    for (let offset = 0; offset < content.length; offset += 6) {
        let position = content.readUInt16LE(offset);
        let sprite = sprites.getByOffset(position);

        elements.push(new Element(
            sprite,
            content.readUInt8(offset + 2),
            content.readUInt8(offset + 3),
            content.readUInt8(offset + 4),
            content.readUInt8(offset + 5)
        ));
    }

    return elements;
}

module.exports = class Animations {
    constructor(name, framesContent, listsContent, elementsContent, sprites) {
        let elements = extractElements(elementsContent, sprites);
        let lists = extractLists(listsContent, elements);
        let frames = extractFrames(framesContent, lists);
        this.animations = extractAnimations(name, frames);
    }

    [Symbol.iterator]() {
        return this.animations[Symbol.iterator]();
    }
};
