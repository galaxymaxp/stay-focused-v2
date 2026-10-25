import type { ImageSourcePropType } from 'react-native';
import pearlLight from '../../../assets/queue/stills/ql1-v1-e6eaf1-light.png';
import pearlDark from '../../../assets/queue/stills/ql1-v1-e6eaf1-dark.png';
import goldLight from '../../../assets/queue/stills/ql1-v1-f4c542-light.png';
import goldDark from '../../../assets/queue/stills/ql1-v1-f4c542-dark.png';
import greenLight from '../../../assets/queue/stills/ql1-v1-91d5b1-light.png';
import greenDark from '../../../assets/queue/stills/ql1-v1-91d5b1-dark.png';
import violetLight from '../../../assets/queue/stills/ql1-v1-cfbaf2-light.png';
import violetDark from '../../../assets/queue/stills/ql1-v1-cfbaf2-dark.png';
import orangeLight from '../../../assets/queue/stills/ql1-v1-f2b679-light.png';
import orangeDark from '../../../assets/queue/stills/ql1-v1-f2b679-dark.png';

const assets: Readonly<Record<string, ImageSourcePropType>> = {
  '#E6EAF1-light': pearlLight, '#E6EAF1-dark': pearlDark,
  '#F4C542-light': goldLight, '#F4C542-dark': goldDark,
  '#91D5B1-light': greenLight, '#91D5B1-dark': greenDark,
  '#CFBAF2-light': violetLight, '#CFBAF2-dark': violetDark,
  '#F2B679-light': orangeLight, '#F2B679-dark': orangeDark,
};
export function queueOrbAsset(color: string, mode: 'light' | 'dark'): ImageSourcePropType {
  return assets[`${color}-${mode}`] ?? assets[`#E6EAF1-${mode}`]!;
}
