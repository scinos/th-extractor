Theme Hospital Extractor
========================

Extracts the graphic assets from Bullfrog's Theme Hospital into PNG and GIF files. This package DOES NOT provide the TH binary assets, you need to get them from your TH CD-ROM. Also, you have to decompress them using the `dernc` decompressor from [http://www.yoda.arachsys.com/dk/utils.html](http://www.yoda.arachsys.com/dk/utils.html)

Based on [http://connection-endpoint.de/th-format-specification/](http://connection-endpoint.de/th-format-specification/)

Requires io.js with ES6 flags, tested with version v2.2.1

Usage
-----

1. Install all required dependencies:
    ```
    npm install
    ```

2. Configure the path of the *uncompressed* TH binary assets. 
    ```
    vi config.js
    // Edit the 'basePath' property
    ```

3. Run the extactor
    ```
    nmp start
    ```

4. The sprites and animations will be in the `./out` directory

Known Bugs & Limitations
------------------------

- Does not generate a separate sprite/animation per "variation". Example: there is only one animation for the female patient, with all the head and skin tones variations overlapped.
- Some sprites are broken (eg: out/sprites/sprites/sprites_44.png)
- Animations are not transparent.
- In an animation, some sprites are meant to be rendered with 50% or 75% alpha. Right now, this is ignored.
