import fs from 'fs';
import url from 'url';
import path from 'path';
import _PNG from 'png-js';
import _JPEG from 'jay-peg';
import { parseSvg } from '@react-pdf/svg';

class PNG {
    data;
    width;
    height;
    format;
    constructor(data) {
        const png = new _PNG(data);
        this.data = data;
        this.width = png.width;
        this.height = png.height;
        this.format = 'png';
    }
    static isValid(data) {
        return (data &&
            Buffer.isBuffer(data) &&
            data[0] === 137 &&
            data[1] === 80 &&
            data[2] === 78 &&
            data[3] === 71 &&
            data[4] === 13 &&
            data[5] === 10 &&
            data[6] === 26 &&
            data[7] === 10);
    }
}

class JPEG {
    data;
    width;
    height;
    format;
    constructor(data) {
        this.data = data;
        this.format = 'jpeg';
        this.width = 0;
        this.height = 0;
        if (data.readUInt16BE(0) !== 0xffd8) {
            throw new Error('SOI not found in JPEG');
        }
        const markers = _JPEG.decode(this.data);
        let orientation;
        for (let i = 0; i < markers.length; i += 1) {
            const marker = markers[i];
            if (marker.name === 'EXIF' && marker.entries.orientation) {
                orientation = marker.entries.orientation;
            }
            if (marker.name === 'SOF') {
                this.width ||= marker.width;
                this.height ||= marker.height;
            }
        }
        if (orientation > 4) {
            [this.width, this.height] = [this.height, this.width];
        }
    }
    static isValid(data) {
        return data && Buffer.isBuffer(data) && data.readUInt16BE(0) === 0xffd8;
    }
}

const UNIT_TO_PT = {
    px: 72 / 96,
    pt: 1,
    in: 72,
    cm: 72 / 2.54,
    mm: 72 / 25.4,
};
function parseNumber(value) {
    if (typeof value !== 'string')
        return undefined;
    const match = value.match(/^(-?\d*\.?\d+)(px|pt|in|cm|mm)?$/);
    if (!match)
        return undefined;
    const num = parseFloat(match[1]);
    const unit = match[2];
    if (!unit)
        return num;
    return num * (UNIT_TO_PT[unit] ?? 1);
}
function parseViewBox(value) {
    if (typeof value !== 'string')
        return undefined;
    const parts = value
        .trim()
        .split(/[\s,]+/)
        .map(Number);
    if (parts.length !== 4 || parts.some(isNaN))
        return undefined;
    return {
        minX: parts[0],
        minY: parts[1],
        maxX: parts[2],
        maxY: parts[3],
    };
}
class SVG {
    data;
    width;
    height;
    format;
    constructor(data) {
        const svgString = data.toString('utf-8');
        const parsed = parseSvg(svgString);
        const viewBox = parseViewBox(parsed.props.viewBox);
        this.data = parsed;
        this.format = 'svg';
        this.width = parseNumber(parsed.props.width) ?? viewBox?.maxX ?? 0;
        this.height = parseNumber(parsed.props.height) ?? viewBox?.maxY ?? 0;
    }
    static isValid(data) {
        if (!Buffer.isBuffer(data))
            return false;
        const str = data.toString('utf-8').trimStart();
        return str.startsWith('<?xml') || str.startsWith('<svg');
    }
}

const createCache = ({ limit = 100 } = {}) => {
    let cache = new Map();
    return {
        get: (key) => key ? cache.get(key) ?? undefined : null,
        set: (key, value) => {
            cache.delete(key);
            if (cache.size >= limit) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            cache.set(key, value);
        },
        reset: () => {
            cache = new Map();
        },
        length: () => cache.size,
    };
};

const IMAGE_CACHE = createCache({ limit: 30 });
const isBuffer = Buffer.isBuffer;
const isBlob = (src) => {
    return typeof Blob !== 'undefined' && src instanceof Blob;
};
const isDataImageSrc = (src) => {
    return 'data' in src;
};
const isDataUri = (imageSrc) => 'uri' in imageSrc && imageSrc.uri.startsWith('data:');
const getAbsoluteLocalPath = (src) => {
    const { protocol, auth, host, port, hostname, path: pathname, } = url.parse(src);
    const absolutePath = pathname ? path.resolve(src) : undefined;
    if ((protocol && protocol !== 'file:') || auth || host || port || hostname) {
        return undefined;
    }
    return absolutePath;
};
const fetchLocalFile = (src) => new Promise((resolve, reject) => {
    try {
        if (false) ;
        const absolutePath = getAbsoluteLocalPath(src.uri);
        if (!absolutePath) {
            reject(new Error(`Cannot fetch non-local path: ${src.uri}`));
            return;
        }
        fs.readFile(absolutePath, (err, data) => err ? reject(err) : resolve(data));
    }
    catch (err) {
        reject(err);
    }
});
const fetchRemoteFile = async (src) => {
    const { method = 'GET', headers, body, credentials } = src;
    const response = await fetch(src.uri, {
        method,
        headers,
        body,
        credentials,
    });
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
};
const isValidFormat = (format) => {
    const lower = format.toLowerCase();
    return (lower === 'jpg' ||
        lower === 'jpeg' ||
        lower === 'png' ||
        lower === 'svg' ||
        lower === 'svg+xml');
};
const getImageFormat = (buffer) => {
    let format;
    if (JPEG.isValid(buffer)) {
        format = 'jpg';
    }
    else if (PNG.isValid(buffer)) {
        format = 'png';
    }
    else if (SVG.isValid(buffer)) {
        format = 'svg';
    }
    return format;
};
function getImage(body, format) {
    switch (format.toLowerCase()) {
        case 'jpg':
        case 'jpeg':
            return new JPEG(body);
        case 'png':
            return new PNG(body);
        case 'svg':
        case 'svg+xml':
            return new SVG(body);
        default:
            return null;
    }
}
const resolveBase64Image = async ({ uri }) => {
    const match = /^data:image\/([a-zA-Z+]*);base64,([^"]*)/g.exec(uri);
    if (!match)
        throw new Error(`Invalid base64 image: ${uri}`);
    const format = match[1];
    const data = match[2];
    if (!isValidFormat(format))
        throw new Error(`Base64 image invalid format: ${format}`);
    return getImage(Buffer.from(data, 'base64'), format);
};
const resolveImageFromData = async (src) => {
    if (src.data && src.format) {
        return getImage(src.data, src.format);
    }
    throw new Error(`Invalid data given for local file: ${JSON.stringify(src)}`);
};
const resolveBufferImage = async (buffer) => {
    const format = getImageFormat(buffer);
    if (format) {
        return getImage(buffer, format);
    }
    return null;
};
const resolveBlobImage = async (blob) => {
    const { type } = blob;
    if (!type || type === 'application/octet-stream') {
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return resolveBufferImage(buffer);
    }
    if (!type.startsWith('image/')) {
        throw new Error(`Invalid blob type: ${type}`);
    }
    const format = type.replace('image/', '');
    if (!isValidFormat(format)) {
        throw new Error(`Invalid blob type: ${type}`);
    }
    const buffer = await blob.arrayBuffer();
    return getImage(Buffer.from(buffer), format);
};
const resolveImageFromUrl = async (src) => {
    const data = getAbsoluteLocalPath(src.uri)
        ? await fetchLocalFile(src)
        : await fetchRemoteFile(src);
    const format = getImageFormat(data);
    if (!format) {
        throw new Error('Not valid image extension');
    }
    return getImage(data, format);
};
const getCacheKey = (src) => {
    if (isBlob(src) || isBuffer(src))
        return null;
    if (isDataImageSrc(src))
        return src.data?.toString('base64') ?? null;
    return src.uri;
};
const resolveImage = (src, { cache = true } = {}) => {
    let image;
    const cacheKey = getCacheKey(src);
    if (isBlob(src)) {
        image = resolveBlobImage(src);
    }
    else if (isBuffer(src)) {
        image = resolveBufferImage(src);
    }
    else if (cache && IMAGE_CACHE.get(cacheKey)) {
        return IMAGE_CACHE.get(cacheKey);
    }
    else if (isDataUri(src)) {
        image = resolveBase64Image(src);
    }
    else if (isDataImageSrc(src)) {
        image = resolveImageFromData(src);
    }
    else {
        image = resolveImageFromUrl(src);
    }
    if (cache && cacheKey) {
        IMAGE_CACHE.set(cacheKey, image);
    }
    return image;
};

export { resolveImage as default };
