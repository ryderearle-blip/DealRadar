import { brand } from './brand';

export function BrandWordmark() {
  return <>{brand.primary}<span>{brand.accent}</span></>;
}
