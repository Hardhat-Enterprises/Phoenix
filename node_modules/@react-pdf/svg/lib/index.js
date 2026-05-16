import * as P from '@react-pdf/primitives';

const XML_ENTITY_MAP = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
};
const ENTITY_REGEX = /&(amp|lt|gt|quot|apos);/g;
const ATTR_REGEX = /([a-zA-Z][a-zA-Z0-9_:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
function decodeXmlEntities(str) {
    return str.replace(ENTITY_REGEX, (_, key) => XML_ENTITY_MAP[key]);
}
function parseAttributes(attrString) {
    const attrs = {};
    ATTR_REGEX.lastIndex = 0;
    let match;
    while ((match = ATTR_REGEX.exec(attrString)) !== null) {
        attrs[match[1]] = decodeXmlEntities(match[2] ?? match[3]);
    }
    return attrs;
}
function tokenize(xmlString) {
    const str = xmlString.replace(/<\?xml[^?]*\?>|<!DOCTYPE[^>]*>|<!--[\s\S]*?-->/gi, '');
    const tokens = [];
    let pos = 0;
    while (pos < str.length) {
        const nextTag = str.indexOf('<', pos);
        if (nextTag === -1)
            break;
        // Text content between tags
        if (nextTag > pos) {
            const raw = str.slice(pos, nextTag);
            if (/\S/.test(raw)) {
                tokens.push({ type: 'text', text: decodeXmlEntities(raw) });
            }
        }
        // CDATA section
        if (str.startsWith('<![CDATA[', nextTag)) {
            const cdataEnd = str.indexOf(']]>', nextTag + 9);
            if (cdataEnd === -1)
                break;
            const text = str.slice(nextTag + 9, cdataEnd);
            if (text) {
                tokens.push({ type: 'text', text });
            }
            pos = cdataEnd + 3;
            continue;
        }
        const tagEnd = str.indexOf('>', nextTag);
        if (tagEnd === -1)
            break;
        const tagContent = str.slice(nextTag + 1, tagEnd);
        pos = tagEnd + 1;
        // Closing tag
        if (tagContent.startsWith('/')) {
            tokens.push({ type: 'close', tagName: tagContent.slice(1).trim() });
            continue;
        }
        // Opening or self-closing tag
        const isSelfClosing = tagContent.endsWith('/');
        const rawTag = isSelfClosing ? tagContent.slice(0, -1) : tagContent;
        const spaceIndex = rawTag.search(/[\s/]/);
        const tagName = spaceIndex === -1 ? rawTag.trim() : rawTag.slice(0, spaceIndex).trim();
        const attrString = spaceIndex === -1 ? '' : rawTag.slice(spaceIndex);
        tokens.push({
            type: isSelfClosing ? 'self-close' : 'open',
            tagName,
            attributes: parseAttributes(attrString),
        });
    }
    return tokens;
}

const CAMEL_CASE_REGEX = /[-:]([a-z])/g;
const TAG_NAME_MAP = {
    svg: P.Svg,
    g: P.G,
    path: P.Path,
    rect: P.Rect,
    circle: P.Circle,
    ellipse: P.Ellipse,
    line: P.Line,
    polyline: P.Polyline,
    polygon: P.Polygon,
    text: P.Text,
    tspan: P.Tspan,
    defs: P.Defs,
    clippath: P.ClipPath,
    lineargradient: P.LinearGradient,
    radialgradient: P.RadialGradient,
    marker: P.Marker,
    stop: P.Stop,
    image: P.Image,
};
const SKIP_ELEMENTS = new Set([
    'script',
    'foreignobject',
    'filter',
    'mask',
    'pattern',
    'use',
    'symbol',
    'animate',
    'animatetransform',
    'animatemotion',
    'set',
]);
const TEXT_TYPES = new Set([P.Text, P.Tspan]);
function toCamelCase(str) {
    return str.replace(CAMEL_CASE_REGEX, (_, letter) => letter.toUpperCase());
}
function parseStyleAttribute(styleString) {
    if (!styleString)
        return {};
    const result = {};
    for (const declaration of styleString.split(';')) {
        const colonIndex = declaration.indexOf(':');
        if (colonIndex === -1)
            continue;
        const property = declaration.slice(0, colonIndex).trim();
        const value = declaration.slice(colonIndex + 1).trim();
        if (property && value) {
            result[toCamelCase(property)] = value;
        }
    }
    return result;
}
function convertAttributes(attributes) {
    const props = {};
    for (const [name, value] of Object.entries(attributes)) {
        if (name === 'style') {
            Object.assign(props, parseStyleAttribute(value));
        }
        else {
            props[toCamelCase(name)] = value;
        }
    }
    return props;
}
function buildTree(tokens) {
    const stack = [];
    const tagNames = [];
    let root = null;
    let skipDepth = 0;
    for (const token of tokens) {
        if (token.type === 'text') {
            if (skipDepth || stack.length === 0)
                continue;
            const parent = stack[stack.length - 1];
            if (!TEXT_TYPES.has(parent.type))
                continue;
            const text = token.text.trim();
            if (text) {
                parent.children.push({
                    type: P.TextInstance,
                    props: {},
                    value: text,
                });
            }
            continue;
        }
        if (token.type === 'close') {
            if (skipDepth) {
                skipDepth--;
            }
            else if (stack.length > 1) {
                if (tagNames[tagNames.length - 1] === token.tagName) {
                    tagNames.pop();
                    stack.pop();
                }
            }
            continue;
        }
        // open or self-close
        if (skipDepth) {
            if (token.type === 'open')
                skipDepth++;
            continue;
        }
        const lowerTag = token.tagName.toLowerCase();
        if (SKIP_ELEMENTS.has(lowerTag)) {
            console.warn(`Unsupported SVG element: <${lowerTag}> will be skipped`);
            if (token.type === 'open')
                skipDepth = 1;
            continue;
        }
        const mappedType = TAG_NAME_MAP[lowerTag];
        if (!mappedType) {
            if (token.type === 'open')
                skipDepth = 1;
            continue;
        }
        const node = {
            type: mappedType,
            props: convertAttributes(token.attributes),
            children: [],
        };
        if (stack.length > 0) {
            stack[stack.length - 1].children.push(node);
        }
        if (!root)
            root = node;
        if (token.type === 'open') {
            tagNames.push(token.tagName);
            stack.push(node);
        }
    }
    return root;
}
const EMPTY_SVG = { type: P.Svg, props: {}, children: [] };
function parseSvg(svgString) {
    const tokens = tokenize(svgString);
    const root = buildTree(tokens);
    if (!root) {
        console.warn('SVG parse error: failed to parse XML');
        return EMPTY_SVG;
    }
    return root;
}

export { parseSvg };
