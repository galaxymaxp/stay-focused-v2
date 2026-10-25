import * as THREE from 'three';

export async function loadGlassAtlas(module: number, metrics: { width: number; height: number }): Promise<THREE.Texture> {
  const { Asset } = await import('expo-asset');
  const { Platform } = await import('react-native');
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  let texture: THREE.Texture;
  if (Platform.OS === 'web') {
    texture = await new THREE.TextureLoader().loadAsync(asset.uri);
  } else {
    if (!asset.localUri) throw new Error('clock_atlas_unavailable');
    texture = new THREE.Texture();
    // Expo GL's tex(Sub)Image2D explicitly accepts {localUri} in the pixels slot.
    // This uses native PNG decoding, not runtime atlas generation or another GL view.
    Object.assign(texture, { isDataTexture: true, unpackAlignment: 1,
      image: { data: { localUri: asset.localUri }, width: metrics.width, height: metrics.height } });
  }
  texture.flipY = false; texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.NoColorSpace; texture.needsUpdate = true;
  return texture;
}
