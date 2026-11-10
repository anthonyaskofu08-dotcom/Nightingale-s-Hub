import type { MediaAsset } from '../../data/demo/media';

export function MediaImage({ asset, className = '', loading = 'lazy', sizes = '(max-width: 700px) 100vw, 50vw' }: { asset: MediaAsset; className?: string; loading?: 'eager' | 'lazy'; sizes?: string }) {
  return <img className={className} src={asset.src} alt={asset.alt} loading={loading} decoding="async" sizes={sizes} width="1350" height="900" />;
}
