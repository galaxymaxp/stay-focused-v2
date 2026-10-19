import { useFonts } from 'expo-font';

// Scoped to Today's readout; all other typography keeps the existing stack.
const fonts = {
  InterClock500: require('../../../assets/fonts/inter/Inter-Medium.ttf'),
  InterClock600: require('../../../assets/fonts/inter/Inter-SemiBold.ttf'),
  InterClock700: require('../../../assets/fonts/inter/Inter-Bold.ttf'),
};
export function useClockFonts() {
  const [loaded] = useFonts(fonts);
  return loaded;
}
