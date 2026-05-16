/// <reference types="node" />
import { SvgNode } from '@react-pdf/svg';

interface RasterImage {
    width: number;
    height: number;
    data: Buffer;
    format: 'jpeg' | 'png';
    key?: string;
}
interface SvgImage {
    width: number;
    height: number;
    data: SvgNode;
    format: 'svg';
    key?: string;
}
type Image = RasterImage | SvgImage;
type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'svg';
type DataImageSrc = {
    data: Buffer;
    format: ImageFormat;
};
type LocalImageSrc = {
    uri: string;
    format?: ImageFormat;
};
type RemoteImageSrc = {
    uri: string;
    method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    format?: ImageFormat;
    body?: any;
    credentials?: 'omit' | 'same-origin' | 'include';
};
type Base64ImageSrc = {
    uri: `data:image${string}`;
};
type ImageSrc = Blob | Buffer | DataImageSrc | LocalImageSrc | RemoteImageSrc | Base64ImageSrc;

declare const resolveImage: (src: ImageSrc, { cache }?: {
    cache?: boolean | undefined;
}) => Promise<Image | null> | null | undefined;

export { type Image, type ImageSrc, type RasterImage, type SvgImage, resolveImage as default };
