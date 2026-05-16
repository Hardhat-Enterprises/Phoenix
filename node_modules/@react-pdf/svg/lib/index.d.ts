interface SvgNode {
    type: string;
    props: Record<string, unknown>;
    children?: SvgNode[];
}

declare function parseSvg(svgString: string): SvgNode;

export { type SvgNode, parseSvg };
